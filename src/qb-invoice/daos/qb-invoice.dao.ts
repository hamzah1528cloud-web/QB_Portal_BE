import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { QbInvoice, QbInvoiceDocument } from '../schemas/qb-invoice.schema';
import { QbInvoiceDTO } from '../dtos/qb-invoice.dto';

@Injectable()
export class QbInvoiceDAO extends BaseDAO<QbInvoiceDocument, QbInvoiceDTO> {
  constructor(@InjectModel(QbInvoice.name) model: Model<QbInvoiceDocument>) {
    super(model);
  }

  async upsertByQbId(businessId: string, qbId: string, data: Partial<QbInvoiceDTO>): Promise<QbInvoiceDocument> {
    return this.upsert({ businessId, qbId }, { ...data, businessId, qbId, lastSyncedAt: new Date() } as any);
  }

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: data as unknown as QbInvoiceDocument[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
