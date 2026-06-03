import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { mapDoc, mapDocs } from 'src/common/utils/db.utils';
import { QbTaxCode, QbTaxCodeDocument } from '../schemas/qb-tax-code.schema';
import { QbTaxCodeDTO } from '../dtos/qb-tax-code.dto';

@Injectable()
export class QbTaxCodeDAO extends BaseDAO<QbTaxCodeDocument, QbTaxCodeDTO> {
  constructor(@InjectModel(QbTaxCode.name) model: Model<QbTaxCodeDocument>) {
    super(model);
  }

  async upsertByQbId(businessId: string, qbId: string, data: Partial<QbTaxCodeDTO>): Promise<QbTaxCodeDocument> {
    return this.upsert({ businessId, qbId }, { ...data, businessId, qbId, lastSyncedAt: new Date() } as any);
  }

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<QbTaxCodeDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
