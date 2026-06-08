import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QB_SYNC_QUEUE, QbSyncJob } from '../constants/queue.constants';
import { SyncService } from '../services/sync.service';
import { OrderService } from 'src/order/services/order.service';

@Processor(QB_SYNC_QUEUE)
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly orderService: OrderService,
  ) {}

  @Process(QbSyncJob.FULL_SYNC)
  async handleFullSync(job: Job<{ businessId: string }>): Promise<void> {
    const { businessId } = job.data;
    this.logger.log(`[Processor] Full sync for business ${businessId} (attempt ${job.attemptsMade + 1})`);
    try {
      const result = await this.syncService.runFullSync(businessId);
      this.logger.log(`[Processor] Full sync done: ${JSON.stringify(result)}`);
    } catch (err) {
      this.logger.error(`[Processor] Full sync failed for business ${businessId}: ${err.message}`);
      throw err;
    }
  }

  @Process(QbSyncJob.SYNC_CUSTOMERS)
  async handleSyncCustomers(job: Job<{ businessId: string }>): Promise<void> {
    await this.syncService.runTargetedSync(job.data.businessId, 'customers');
  }

  @Process(QbSyncJob.SYNC_PRODUCTS)
  async handleSyncProducts(job: Job<{ businessId: string }>): Promise<void> {
    await this.syncService.runTargetedSync(job.data.businessId, 'products');
  }

  @Process(QbSyncJob.SYNC_INVOICES)
  async handleSyncInvoices(job: Job<{ businessId: string }>): Promise<void> {
    await this.syncService.runTargetedSync(job.data.businessId, 'invoices');
  }

  @Process(QbSyncJob.SYNC_PAYMENTS)
  async handleSyncPayments(job: Job<{ businessId: string }>): Promise<void> {
    await this.syncService.runTargetedSync(job.data.businessId, 'payments');
  }

  @Process(QbSyncJob.SYNC_CREDIT_MEMOS)
  async handleSyncCreditMemos(job: Job<{ businessId: string }>): Promise<void> {
    await this.syncService.runTargetedSync(job.data.businessId, 'creditMemos');
  }

  @Process(QbSyncJob.SYNC_TAX_CODES)
  async handleSyncTaxCodes(job: Job<{ businessId: string }>): Promise<void> {
    await this.syncService.runTargetedSync(job.data.businessId, 'taxCodes');
  }

  // Fetch the estimate from QB and apply its status to our matching order
  @Process(QbSyncJob.ESTIMATE_STATUS_SYNC)
  async handleEstimateStatusSync(job: Job<{ businessId: string; estimateId: string }>): Promise<void> {
    const { businessId, estimateId } = job.data;
    this.logger.log(`[Processor] Estimate status sync — business ${businessId}, estimate ${estimateId}`);

    try {
      const tokens = await this.syncService.getTokensForProcessor(businessId);
      if (!tokens) {
        this.logger.warn(`[Processor] No QB tokens for business ${businessId} — skipping estimate sync`);
        return;
      }

      const estimate = await this.syncService.fetchEstimate(tokens.accessToken, tokens.realmId, estimateId);
      if (!estimate) {
        this.logger.warn(`[Processor] Estimate ${estimateId} not found in QB`);
        return;
      }

      // Extract linked invoice ID if estimate was converted
      let linkedInvoiceId: string | undefined;
      if (estimate.TxnStatus === 'Closed' && Array.isArray(estimate.LinkedTxn)) {
        const invoiceLink = estimate.LinkedTxn.find((t: any) => t.TxnType === 'Invoice');
        linkedInvoiceId = invoiceLink?.TxnId;
      }

      await this.orderService.applyQbEstimateStatus(businessId, estimateId, estimate.TxnStatus ?? '', linkedInvoiceId);
    } catch (err) {
      this.logger.error(`[Processor] Estimate status sync failed: ${err.message}`);
      throw err; // Bull will retry
    }
  }

  // Fetch the invoice from QB, find any linked estimate, and store the invoice ID on our order
  @Process(QbSyncJob.INVOICE_LINKED_ESTIMATE)
  async handleInvoiceLinkedEstimate(job: Job<{ businessId: string; invoiceId: string }>): Promise<void> {
    const { businessId, invoiceId } = job.data;
    this.logger.log(`[Processor] Invoice linked-estimate check — business ${businessId}, invoice ${invoiceId}`);

    try {
      const tokens = await this.syncService.getTokensForProcessor(businessId);
      if (!tokens) return;

      const invoice = await this.syncService.fetchInvoice(tokens.accessToken, tokens.realmId, invoiceId);
      if (!invoice || !Array.isArray(invoice.LinkedTxn)) return;

      for (const link of invoice.LinkedTxn) {
        if (link.TxnType === 'Estimate' && link.TxnId) {
          await this.orderService.applyQbInvoiceLinked(businessId, link.TxnId, invoiceId);
        }
      }
    } catch (err) {
      this.logger.error(`[Processor] Invoice linked-estimate check failed: ${err.message}`);
      throw err;
    }
  }
}
