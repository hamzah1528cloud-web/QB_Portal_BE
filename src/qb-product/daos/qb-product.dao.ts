import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { QbProduct, QbProductDocument } from '../schemas/qb-product.schema';
import { QbProductDTO } from '../dtos/qb-product.dto';

@Injectable()
export class QbProductDAO extends BaseDAO<QbProductDocument, QbProductDTO> {
  constructor(@InjectModel(QbProduct.name) model: Model<QbProductDocument>) {
    super(model);
  }

  async upsertByQbId(businessId: string, qbId: string, data: Partial<QbProductDTO>): Promise<QbProductDocument> {
    return this.upsert({ businessId, qbId }, { ...data, businessId, qbId, lastSyncedAt: new Date() } as any);
  }

  async findAllByBusiness(businessId: string): Promise<QbProductDocument[]> {
    return this.model.find({ businessId, isActive: true }).lean().exec() as Promise<QbProductDocument[]>;
  }
}
