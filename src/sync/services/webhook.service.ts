import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { QB_WEBHOOK_VERIFIER_TOKEN } from 'src/common/config/secrets';
import { BusinessDAO } from 'src/business/daos/business.dao';
import { QB_SYNC_QUEUE, QbSyncJob } from '../constants/queue.constants';
import { SyncService } from './sync.service';

interface CloudEvent {
  specversion: string;
  id: string;
  type: string;           // e.g. "qbo.estimate.updated.v1"
  time: string;
  intuitentityid: string; // QB entity ID (estimate ID, invoice ID, etc.)
  intuitaccountid: string; // realmId
  data?: Record<string, any>;
}

const CLOUD_EVENT_TYPE_TO_ENTITY: Record<string, string> = {
  'qbo.invoice':    'Invoice',
  'qbo.customer':   'Customer',
  'qbo.item':       'Item',
  'qbo.payment':    'Payment',
  'qbo.creditmemo': 'CreditMemo',
  'qbo.taxcode':    'TaxCode',
  'qbo.estimate':   'Estimate',
};

function resolveEntity(type: string): string | null {
  for (const [prefix, entity] of Object.entries(CLOUD_EVENT_TYPE_TO_ENTITY)) {
    if (type.startsWith(prefix)) return entity;
  }
  return null;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectQueue(QB_SYNC_QUEUE) private readonly syncQueue: Queue,
    private readonly businessDAO: BusinessDAO,
    private readonly syncService: SyncService,
  ) {}

  verifySignature(rawBody: Buffer, signature: string): boolean {
    if (!QB_WEBHOOK_VERIFIER_TOKEN) return false;
    const expected = crypto
      .createHmac('sha256', QB_WEBHOOK_VERIFIER_TOKEN)
      .update(rawBody)
      .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  async processPayload(events: CloudEvent[]): Promise<void> {
    if (!Array.isArray(events) || events.length === 0) {
      this.logger.warn('[Webhook] Empty or invalid CloudEvents payload');
      return;
    }

    // Group by realmId — separate buckets for estimate/invoice (per-ID) vs others (per-type)
    const byRealm = new Map<string, {
      genericEntities: Set<string>;
      estimateIds: Set<string>;
      invoiceIds: Set<string>;
    }>();

    for (const event of events) {
      const realmId = event.intuitaccountid;
      const entity = resolveEntity(event.type);

      if (!realmId || !entity) {
        this.logger.warn(`[Webhook] Skipping event — realmId=${realmId} type=${event.type}`);
        continue;
      }

      if (!byRealm.has(realmId)) {
        byRealm.set(realmId, { genericEntities: new Set(), estimateIds: new Set(), invoiceIds: new Set() });
      }

      const bucket = byRealm.get(realmId)!;

      if (entity === 'Estimate' && event.intuitentityid) {
        bucket.estimateIds.add(event.intuitentityid);
      } else if (entity === 'Invoice' && event.intuitentityid) {
        // Enqueue both the regular invoice sync AND the linked-estimate check
        bucket.invoiceIds.add(event.intuitentityid);
        bucket.genericEntities.add('Invoice');
      } else {
        bucket.genericEntities.add(entity);
      }
    }

    for (const [realmId, { genericEntities, estimateIds, invoiceIds }] of byRealm) {
      const business = await this.businessDAO.findByRealmId(realmId);
      if (!business) {
        this.logger.warn(`[Webhook] No business found for realmId ${realmId} — skipping`);
        continue;
      }

      const businessId = (business as any).id;
      this.logger.log(`[Webhook] Business ${businessId} — entities: ${[...genericEntities].join(', ')} | estimates: ${[...estimateIds].join(', ')} | invoices: ${[...invoiceIds].join(', ')}`);

      // Generic targeted syncs (customers, products, invoices, etc.)
      for (const entity of genericEntities) {
        await this.syncService.enqueueTargetedSync(businessId, entity);
      }

      // Per-estimate status jobs — each estimate ID gets its own job
      for (const estimateId of estimateIds) {
        await this.syncQueue.add(
          QbSyncJob.ESTIMATE_STATUS_SYNC,
          { businessId, estimateId },
          { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, jobId: `estimate-${businessId}-${estimateId}` },
        );
      }

      // Per-invoice linked-estimate jobs
      for (const invoiceId of invoiceIds) {
        await this.syncQueue.add(
          QbSyncJob.INVOICE_LINKED_ESTIMATE,
          { businessId, invoiceId },
          { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, jobId: `invoice-link-${businessId}-${invoiceId}` },
        );
      }
    }
  }
}
