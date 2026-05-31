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

  async findAllByBusiness(businessId: string): Promise<QbCustomerDocument[]> {
    return this.model.find({ businessId, isActive: true }).lean().exec() as Promise<QbCustomerDocument[]>;
  }
}
