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

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId, isActive: true };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean({ virtuals: true }).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: data as unknown as QbProductDocument[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
