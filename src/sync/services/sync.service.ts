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
import { QB_SYNC_QUEUE, QbSyncJob } from '../constants/queue.constants';
import { QbCustomersSyncService } from './qb-customers-sync.service';
import { QbProductsSyncService } from './qb-products-sync.service';
import { QbInvoicesSyncService } from './qb-invoices-sync.service';

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
  ) {}

  async enqueueSyncForBusiness(businessId: string): Promise<void> {
    await this.syncQueue.add(QbSyncJob.FULL_SYNC, { businessId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    this.logger.log(`[Sync] Enqueued full sync for business ${businessId}`);
  }

  async runFullSync(businessId: string): Promise<{ customers: number; products: number; invoices: number }> {
    const business = await this.businessDAO.findById(businessId);

    if (!business.isQbConnected) {
      throw new CustomError('QuickBooks is not connected for this business', HttpStatusCode.BAD_REQUEST, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_NOT_CONNECTED);
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

    const [customers, products, invoices] = await Promise.all([
      this.customersSyncService.syncAll(businessId, qbAccessToken, qbRealmId),
      this.productsSyncService.syncAll(businessId, qbAccessToken, qbRealmId),
      this.invoicesSyncService.syncAll(businessId, qbAccessToken, qbRealmId),
    ]);

    await this.businessDAO.updateById(businessId, { qbLastSyncedAt: new Date() } as any);

    this.logger.log(`[Sync] Full sync complete for business ${businessId}: ${customers} customers, ${products} products, ${invoices} invoices`);
    return { customers, products, invoices };
  }
}
