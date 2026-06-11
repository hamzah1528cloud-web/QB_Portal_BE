import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { mapDoc, mapDocs } from 'src/common/utils/db.utils';
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

  async findByIdAndBusiness(id: string, businessId: string): Promise<QbInvoiceDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId }).lean().exec();
    return mapDoc<QbInvoiceDocument>(doc);
  }

  async findPaginatedByQbCustomer(businessId: string, qbCustomerId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId, qbCustomerId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<QbInvoiceDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllByBusiness(businessId: string, page: number, limit: number, filters?: { status?: string; customerId?: string }) {
    const skip = (page - 1) * limit;
    const filter: any = { businessId };

    if (filters?.status)     filter.status       = filters.status;
    if (filters?.customerId) filter.qbCustomerId = filters.customerId;

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<QbInvoiceDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
