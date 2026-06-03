import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { QbPayment, QbPaymentDocument } from '../schemas/qb-payment.schema';
import { QbPaymentDTO } from '../dtos/qb-payment.dto';

@Injectable()
export class QbPaymentDAO extends BaseDAO<QbPaymentDocument, QbPaymentDTO> {
  constructor(@InjectModel(QbPayment.name) model: Model<QbPaymentDocument>) {
    super(model);
  }

  async upsertByQbId(businessId: string, qbId: string, data: Partial<QbPaymentDTO>): Promise<QbPaymentDocument> {
    return this.upsert({ businessId, qbId }, { ...data, businessId, qbId, lastSyncedAt: new Date() } as any);
  }

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ txnDate: -1 }).skip(skip).limit(limit).lean({ virtuals: true }).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: data as unknown as QbPaymentDocument[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
