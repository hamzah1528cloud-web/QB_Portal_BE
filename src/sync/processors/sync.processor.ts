import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QB_SYNC_QUEUE, QbSyncJob } from '../constants/queue.constants';
import { SyncService } from '../services/sync.service';

@Processor(QB_SYNC_QUEUE)
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly syncService: SyncService) {}

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
}
