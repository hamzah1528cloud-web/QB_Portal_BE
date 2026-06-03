import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { Order, OrderDocument } from '../schemas/order.schema';
import { CreateOrderDTO } from '../dtos/order.dto';

@Injectable()
export class OrderDAO extends BaseDAO<OrderDocument, CreateOrderDTO> {
  constructor(@InjectModel(Order.name) model: Model<OrderDocument>) {
    super(model);
  }

  async findPaginatedByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: data as unknown as OrderDocument[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPaginatedByPortalUser(businessId: string, portalUserId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId, portalUserId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: data as unknown as OrderDocument[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdAndBusiness(id: string, businessId: string): Promise<OrderDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId }).lean({ virtuals: true }).exec();
    return doc as unknown as OrderDocument | null;
  }

  async findByIdAndPortalUser(id: string, businessId: string, portalUserId: string): Promise<OrderDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId, portalUserId }).lean({ virtuals: true }).exec();
    return doc as unknown as OrderDocument | null;
  }
}
