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

  async findAllByBusiness(businessId: string): Promise<QbInvoiceDocument[]> {
    return this.model.find({ businessId }).sort({ createdAt: -1 }).lean().exec() as unknown as Promise<QbInvoiceDocument[]>;
  }
}
