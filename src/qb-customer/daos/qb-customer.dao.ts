import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { mapDoc, mapDocs } from 'src/common/utils/db.utils';
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
    const doc = await this.model.findOne({ businessId, qbId }).lean().exec();
    return mapDoc<QbCustomerDocument>(doc);
  }

  async findByIdAndBusiness(id: string, businessId: string): Promise<QbCustomerDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId }).lean().exec();
    return mapDoc<QbCustomerDocument>(doc);
  }

  async findAllByBusiness(businessId: string, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const filter: any = { businessId, isActive: true };

    if (search?.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<QbCustomerDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
