import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BusinessDAO } from 'src/business/daos/business.dao';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { SyncService } from 'src/sync/services/sync.service';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { QbConnectionStatusDTO } from '../dtos/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly stateStore = new Map<string, string>();

  constructor(
    private readonly businessDAO: BusinessDAO,
    private readonly qbClient: QuickBooksClient,
    private readonly syncService: SyncService,
    private readonly jwtService: JwtService,
  ) {}

  generateQbAuthUrl(businessId: string): string {
    const state = crypto.randomBytes(16).toString('hex');
    this.stateStore.set(state, businessId);
    setTimeout(() => this.stateStore.delete(state), 10 * 60 * 1000);
    return this.qbClient.buildAuthUrl(state);
  }

  async handleQbCallback(code: string, realmId: string, state: string): Promise<void> {
    const businessId = this.stateStore.get(state);
    if (!businessId) {
      throw new CustomError('Invalid or expired OAuth state', HttpStatusCode.BAD_REQUEST, ApiErrorCode.AUTH, ApiErrorSubCode.BAD_DATA);
    }
    this.stateStore.delete(state);

    const tokens = await this.qbClient.exchangeCode(code);
    const now = Date.now();
    const expiresAt = new Date(now + tokens.expires_in * 1000);
    const refreshExpiresAt = new Date(now + tokens.x_refresh_token_expires_in * 1000);

    await this.businessDAO.updateQbTokens(businessId, {
      qbAccessToken: tokens.access_token,
      qbRefreshToken: tokens.refresh_token,
      qbTokenExpiresAt: expiresAt,
      qbRefreshTokenExpiresAt: refreshExpiresAt,
      isQbConnected: true,
      qbRealmId: realmId,
      qbConnectedAt: new Date(),
    });

    this.logger.log(`QB connected for business ${businessId} (realm: ${realmId}). Triggering initial sync.`);
    await this.syncService.enqueueSyncForBusiness(businessId);
  }

  async getQbStatus(businessId: string): Promise<QbConnectionStatusDTO> {
    const business = await this.businessDAO.findById(businessId);
    return {
      isConnected: (business as any).isQbConnected,
      connectedAt: (business as any).qbConnectedAt,
      lastSyncedAt: (business as any).qbLastSyncedAt,
      realmId: (business as any).qbRealmId,
    };
  }

  async disconnectQb(businessId: string): Promise<void> {
    const business = await this.businessDAO.findById(businessId);
    if ((business as any).qbRefreshToken) {
      await this.qbClient.revokeToken((business as any).qbRefreshToken);
    }
    await this.businessDAO.clearQbTokens(businessId);
    this.logger.log(`QB disconnected for business ${businessId}`);
  }

  async signToken(businessId: string, email: string): Promise<string> {
    return this.jwtService.signAsync({ businessId, email });
  }
}
