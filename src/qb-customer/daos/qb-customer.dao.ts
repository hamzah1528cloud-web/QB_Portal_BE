import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { QbCustomer, QbCustomerDocument } from '../schemas/qb-customer.schema';
import { QbCustomerDTO } from '../dtos/qb-customer.dto';

@Injectable()
export class QbCustomerDAO extends BaseDAO<QbCustomerDocument, QbCustomerDTO> {
  constructor(@InjectModel(QbCustomer.name) model: Model<QbCustomerDocument>) {
    super(model);
  }

  async upsertByQbId(businessId: string, qbId: string, data: Partial<QbCustomerDTO>): Promise<QbCustomerDocument> {
    return this.upsert({ businessId, qbId }, { ...data, businessId, qbId, lastSyncedAt: new Date() } as any);
  }

  async findByQbId(businessId: string, qbId: string): Promise<QbCustomerDocument | null> {
    const doc = await this.model.findOne({ businessId, qbId }).lean({ virtuals: true }).exec();
    return doc as unknown as QbCustomerDocument | null;
  }

  async findByIdAndBusiness(id: string, businessId: string): Promise<QbCustomerDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId }).lean({ virtuals: true }).exec();
    return doc as unknown as QbCustomerDocument | null;
  }

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId, isActive: true };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean({ virtuals: true }).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: data as unknown as QbCustomerDocument[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
