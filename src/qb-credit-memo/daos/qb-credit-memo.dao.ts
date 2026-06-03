import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { mapDoc, mapDocs } from 'src/common/utils/db.utils';
import { QbCreditMemo, QbCreditMemoDocument } from '../schemas/qb-credit-memo.schema';
import { QbCreditMemoDTO } from '../dtos/qb-credit-memo.dto';

@Injectable()
export class QbCreditMemoDAO extends BaseDAO<QbCreditMemoDocument, QbCreditMemoDTO> {
  constructor(@InjectModel(QbCreditMemo.name) model: Model<QbCreditMemoDocument>) {
    super(model);
  }

  async upsertByQbId(businessId: string, qbId: string, data: Partial<QbCreditMemoDTO>): Promise<QbCreditMemoDocument> {
    return this.upsert({ businessId, qbId }, { ...data, businessId, qbId, lastSyncedAt: new Date() } as any);
  }

  async findPaginatedByQbCustomer(businessId: string, qbCustomerId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId, qbCustomerId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ txnDate: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<QbCreditMemoDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ txnDate: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<QbCreditMemoDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
