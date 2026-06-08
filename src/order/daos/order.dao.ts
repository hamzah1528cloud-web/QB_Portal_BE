import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { mapDoc, mapDocs } from 'src/common/utils/db.utils';
import { Order, OrderDocument } from '../schemas/order.schema';
import { CreateOrderDTO } from '../dtos/order.dto';

@Injectable()
export class OrderDAO extends BaseDAO<OrderDocument, CreateOrderDTO> {
  constructor(@InjectModel(Order.name) model: Model<OrderDocument>) {
    super(model);
  }

  async findPaginatedByBusiness(businessId: string, page: number, limit: number, filters?: { status?: string; search?: string }) {
    const skip = (page - 1) * limit;
    const filter: any = { businessId };

    if (filters?.status)        filter.status       = filters.status;
    if (filters?.search?.trim()) filter.customerName = new RegExp(filters.search.trim(), 'i');

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<OrderDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPaginatedByPortalUser(businessId: string, portalUserId: string, page: number, limit: number, filters?: { status?: string }) {
    const skip = (page - 1) * limit;
    const filter: any = { businessId, portalUserId };

    if (filters?.status) filter.status = filters.status;

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<OrderDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdAndBusiness(id: string, businessId: string): Promise<OrderDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId }).lean().exec();
    return mapDoc<OrderDocument>(doc);
  }

  async findByIdAndPortalUser(id: string, businessId: string, portalUserId: string): Promise<OrderDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId, portalUserId }).lean().exec();
    return mapDoc<OrderDocument>(doc);
  }

  async findByQbEstimateId(businessId: string, qbEstimateId: string): Promise<OrderDocument | null> {
    const doc = await this.model.findOne({ businessId, qbEstimateId }).lean().exec();
    return mapDoc<OrderDocument>(doc);
  }

  async findPaginatedByQbCustomer(businessId: string, qbCustomerId: string, page: number, limit: number, filters?: { status?: string }) {
    const skip = (page - 1) * limit;
    const filter: any = { businessId, qbCustomerId };
    if (filters?.status) filter.status = filters.status;

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<OrderDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdAndQbCustomer(id: string, businessId: string, qbCustomerId: string): Promise<OrderDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId, qbCustomerId }).lean().exec();
    return mapDoc<OrderDocument>(doc);
  }
}
