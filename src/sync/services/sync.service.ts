import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BusinessDAO } from 'src/business/daos/business.dao';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { isTokenExpired } from 'src/common/utils/utils';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { QB_SYNC_QUEUE, QbSyncJob, QB_ENTITY_TO_JOB } from '../constants/queue.constants';
import { QbCustomersSyncService } from './qb-customers-sync.service';
import { QbProductsSyncService } from './qb-products-sync.service';
import { QbInvoicesSyncService } from './qb-invoices-sync.service';
import { QbPaymentsSyncService } from './qb-payments-sync.service';
import { QbCreditMemosSyncService } from './qb-credit-memos-sync.service';
import { QbTaxCodesSyncService } from './qb-tax-codes-sync.service';

type TargetEntity = 'customers' | 'products' | 'invoices' | 'payments' | 'creditMemos' | 'taxCodes';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectQueue(QB_SYNC_QUEUE) private readonly syncQueue: Queue,
    private readonly businessDAO: BusinessDAO,
    private readonly qbClient: QuickBooksClient,
    private readonly customersSyncService: QbCustomersSyncService,
    private readonly productsSyncService: QbProductsSyncService,
    private readonly invoicesSyncService: QbInvoicesSyncService,
    private readonly paymentsSyncService: QbPaymentsSyncService,
    private readonly creditMemosSyncService: QbCreditMemosSyncService,
    private readonly taxCodesSyncService: QbTaxCodesSyncService,
  ) {}

  async enqueueSyncForBusiness(businessId: string): Promise<void> {
    await this.syncQueue.add(QbSyncJob.FULL_SYNC, { businessId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    this.logger.log(`[Sync] Enqueued full sync for business ${businessId}`);
  }

  async enqueueTargetedSync(businessId: string, qbEntityName: string): Promise<void> {
    const jobType = QB_ENTITY_TO_JOB[qbEntityName];
    if (!jobType) {
      this.logger.warn(`[Sync] No job mapping for QB entity: ${qbEntityName}`);
      return;
    }
    await this.syncQueue.add(jobType, { businessId }, { attempts: 3, backoff: { type: 'exponential', delay: 3000 } });
    this.logger.log(`[Sync] Enqueued targeted sync (${jobType}) for business ${businessId}`);
  }

  private async getTokens(businessId: string): Promise<{ accessToken: string; realmId: string }> {
    const business = await this.businessDAO.findById(businessId);

    if (!(business as any).isQbConnected) {
      throw new CustomError('QuickBooks is not connected', HttpStatusCode.BAD_REQUEST, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_NOT_CONNECTED);
    }

    let { qbAccessToken, qbRefreshToken, qbTokenExpiresAt, qbRealmId } = business as any;

    if (isTokenExpired(qbTokenExpiresAt)) {
      this.logger.log(`[Sync] Access token expired, refreshing for business ${businessId}`);
      const tokens = await this.qbClient.refreshTokens(qbRefreshToken);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const refreshExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000);
      await this.businessDAO.updateQbTokens(businessId, {
        qbAccessToken: tokens.access_token,
        qbRefreshToken: tokens.refresh_token,
        qbTokenExpiresAt: expiresAt,
        qbRefreshTokenExpiresAt: refreshExpiresAt,
        isQbConnected: true,
      });
      qbAccessToken = tokens.access_token;
    }

    return { accessToken: qbAccessToken, realmId: qbRealmId };
  }

  async runTargetedSync(businessId: string, entity: TargetEntity): Promise<number> {
    const { accessToken, realmId } = await this.getTokens(businessId);
    this.logger.log(`[Sync] Targeted sync (${entity}) for business ${businessId}`);

    const syncMap: Record<TargetEntity, () => Promise<number>> = {
      customers:   () => this.customersSyncService.syncAll(businessId, accessToken, realmId),
      products:    () => this.productsSyncService.syncAll(businessId, accessToken, realmId),
      invoices:    () => this.invoicesSyncService.syncAll(businessId, accessToken, realmId),
      payments:    () => this.paymentsSyncService.syncAll(businessId, accessToken, realmId),
      creditMemos: () => this.creditMemosSyncService.syncAll(businessId, accessToken, realmId),
      taxCodes:    () => this.taxCodesSyncService.syncAll(businessId, accessToken, realmId),
    };

    const count = await syncMap[entity]();
    await this.businessDAO.updateById(businessId, { qbLastSyncedAt: new Date() } as any);
    return count;
  }

  async runFullSync(businessId: string): Promise<{ customers: number; products: number; invoices: number; payments: number; creditMemos: number; taxCodes: number }> {
    const { accessToken, realmId } = await this.getTokens(businessId);

    const [customers, products, invoices, payments, creditMemos, taxCodes] = await Promise.all([
      this.customersSyncService.syncAll(businessId, accessToken, realmId),
      this.productsSyncService.syncAll(businessId, accessToken, realmId),
      this.invoicesSyncService.syncAll(businessId, accessToken, realmId),
      this.paymentsSyncService.syncAll(businessId, accessToken, realmId),
      this.creditMemosSyncService.syncAll(businessId, accessToken, realmId),
      this.taxCodesSyncService.syncAll(businessId, accessToken, realmId),
    ]);

    await this.businessDAO.updateById(businessId, { qbLastSyncedAt: new Date() } as any);
    this.logger.log(`[Sync] Full sync complete for business ${businessId}: ${customers} customers, ${products} products, ${invoices} invoices, ${payments} payments, ${creditMemos} credit memos, ${taxCodes} tax codes`);
    return { customers, products, invoices, payments, creditMemos, taxCodes };
  }
}
