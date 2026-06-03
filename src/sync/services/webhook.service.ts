import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { QB_WEBHOOK_VERIFIER_TOKEN } from 'src/common/config/secrets';
import { BusinessDAO } from 'src/business/daos/business.dao';
import { SyncService } from './sync.service';

interface CloudEvent {
  specversion: string;
  id: string;
  type: string;           // e.g. "qbo.invoice.updated.v1"
  time: string;
  intuitentityid: string;
  intuitaccountid: string; // realmId
  data?: Record<string, any>;
}

// Maps CloudEvents type prefix → QB entity name used in our job map
const CLOUD_EVENT_TYPE_TO_ENTITY: Record<string, string> = {
  'qbo.invoice':    'Invoice',
  'qbo.customer':   'Customer',
  'qbo.item':       'Item',
  'qbo.payment':    'Payment',
  'qbo.creditmemo': 'CreditMemo',
  'qbo.taxcode':    'TaxCode',
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

    // Group by realmId → deduplicated entity set (avoids N sync jobs for N changed entities of same type)
    const byRealm = new Map<string, Set<string>>();

    for (const event of events) {
      const realmId = event.intuitaccountid;
      const entity = resolveEntity(event.type);

      if (!realmId || !entity) {
        this.logger.warn(`[Webhook] Skipping event — realmId=${realmId} type=${event.type}`);
        continue;
      }

      if (!byRealm.has(realmId)) byRealm.set(realmId, new Set());
      byRealm.get(realmId)!.add(entity);
    }

    for (const [realmId, entities] of byRealm) {
      const business = await this.businessDAO.findByRealmId(realmId);
      if (!business) {
        this.logger.warn(`[Webhook] No business found for realmId ${realmId} — skipping`);
        continue;
      }

      const businessId = (business as any).id;
      this.logger.log(`[Webhook] Business ${businessId} — changed: ${[...entities].join(', ')}`);

      for (const entity of entities) {
        await this.syncService.enqueueTargetedSync(businessId, entity);
      }
    }
  }
}
