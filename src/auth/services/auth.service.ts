import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { BusinessDAO } from 'src/business/daos/business.dao';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { SyncService } from 'src/sync/services/sync.service';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { JWT_SECRET } from 'src/common/config/secrets';
import { AuthResponseDTO, QbConnectionStatusDTO } from '../dtos/auth.dto';
import * as cryptoModule from 'crypto';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateRefreshToken(): string {
  return cryptoModule.randomBytes(40).toString('hex');
}

function hashRefreshToken(token: string): string {
  return cryptoModule.createHash('sha256').update(token).digest('hex');
}

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

  private async issueTokens(businessId: string, email: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.jwtService.signAsync({ businessId, email });

    const refreshToken = generateRefreshToken();
    const hash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.businessDAO.storeRefreshToken(businessId, hash, expiresAt);

    return { accessToken, refreshToken };
  }

  async register(name: string, email: string, password: string): Promise<AuthResponseDTO> {
    const existing = await this.businessDAO.findByEmail(email);
    if (existing) {
      throw new CustomError('An account with this email already exists', HttpStatusCode.CONFLICT, ApiErrorCode.AUTH, ApiErrorSubCode.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const business = await this.businessDAO.create({ name, email, passwordHash } as any);
    const businessId = (business as any).id;

    const { accessToken, refreshToken } = await this.issueTokens(businessId, email);
    return { accessToken, refreshToken, businessId, name, email };
  }

  async login(email: string, password: string): Promise<AuthResponseDTO> {
    const business = await this.businessDAO.findByEmail(email);
    if (!business) {
      throw new CustomError('Invalid email or password', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    }

    const valid = await bcrypt.compare(password, (business as any).passwordHash);
    if (!valid) {
      throw new CustomError('Invalid email or password', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    }

    const businessId = (business as any).id;
    const { accessToken, refreshToken } = await this.issueTokens(businessId, email);
    return { accessToken, refreshToken, businessId, name: (business as any).name, email };
  }

  async refresh(rawRefreshToken: string): Promise<{ accessToken: string }> {
    const hash = hashRefreshToken(rawRefreshToken);
    const business = await this.businessDAO.findByRefreshTokenHash(hash);

    if (!business) {
      throw new CustomError('Invalid or expired refresh token', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    }

    const businessId = (business as any).id;
    const email = (business as any).email;
    const accessToken = await this.jwtService.signAsync({ businessId, email });

    return { accessToken };
  }

  async logout(businessId: string): Promise<void> {
    await this.businessDAO.clearRefreshToken(businessId);
  }

  getQbConnectUrl(businessId: string): { url: string } {
    const state = cryptoModule.randomBytes(16).toString('hex');
    this.stateStore.set(state, businessId);
    setTimeout(() => this.stateStore.delete(state), 10 * 60 * 1000);
    return { url: this.qbClient.buildAuthUrl(state) };
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
}
