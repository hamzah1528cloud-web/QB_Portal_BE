import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { mapDoc, mapDocs } from 'src/common/utils/db.utils';
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

  async findByIdAndBusiness(id: string, businessId: string): Promise<QbProductDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId }).lean().exec();
    return mapDoc<QbProductDocument>(doc);
  }

  async findAllByBusiness(businessId: string, page: number, limit: number, filters?: { search?: string; includeInactive?: boolean }) {
    const skip = (page - 1) * limit;
    const filter: any = { businessId };

    if (!filters?.includeInactive) filter.isActive = true;

    if (filters?.search?.trim()) {
      const re = new RegExp(filters.search.trim(), 'i');
      filter.$or = [{ name: re }, { sku: re }];
    }

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<QbProductDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
