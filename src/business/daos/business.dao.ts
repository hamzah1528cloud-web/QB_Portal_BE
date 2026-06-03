import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { Business, BusinessDocument } from '../schemas/business.schema';
import { BusinessDTO } from '../dtos/business.dto';

@Injectable()
export class BusinessDAO extends BaseDAO<BusinessDocument, BusinessDTO> {
  constructor(@InjectModel(Business.name) model: Model<BusinessDocument>) {
    super(model);
  }

  async findByEmail(email: string): Promise<BusinessDocument | null> {
    return this.findOne({ email });
  }

  async findByRealmId(qbRealmId: string): Promise<BusinessDocument | null> {
    return this.findOne({ qbRealmId });
  }

  async updateQbTokens(
    businessId: string,
    data: { qbAccessToken: string; qbRefreshToken: string; qbTokenExpiresAt: Date; qbRefreshTokenExpiresAt: Date; isQbConnected: boolean; qbRealmId?: string; qbConnectedAt?: Date },
  ): Promise<BusinessDocument> {
    return this.updateById(businessId, data as any);
  }

  async storeRefreshToken(businessId: string, hash: string, expiresAt: Date): Promise<void> {
    await this.updateById(businessId, { refreshTokenHash: hash, refreshTokenExpiresAt: expiresAt } as any);
  }

  async findByRefreshTokenHash(hash: string): Promise<BusinessDocument | null> {
    return this.findOne({ refreshTokenHash: hash, refreshTokenExpiresAt: { $gt: new Date() } });
  }

  async clearRefreshToken(businessId: string): Promise<void> {
    await this.updateById(businessId, { refreshTokenHash: null, refreshTokenExpiresAt: null } as any);
  }

  async clearQbTokens(businessId: string): Promise<BusinessDocument> {
    return this.updateById(businessId, {
      qbAccessToken: null,
      qbRefreshToken: null,
      qbTokenExpiresAt: null,
      qbRefreshTokenExpiresAt: null,
      isQbConnected: false,
      qbRealmId: null,
    } as any);
  }
}
