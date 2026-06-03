import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { PortalUser, PortalUserDocument } from '../schemas/portal-user.schema';

@Injectable()
export class PortalUserDAO extends BaseDAO<PortalUserDocument, any> {
  constructor(@InjectModel(PortalUser.name) model: Model<PortalUserDocument>) {
    super(model);
  }

  async findByBusinessAndEmail(businessId: string, email: string): Promise<PortalUserDocument | null> {
    return this.findOne({ businessId, email });
  }

  async findByIdAndBusiness(id: string, businessId: string): Promise<PortalUserDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId }).lean({ virtuals: true }).exec();
    return doc as unknown as PortalUserDocument | null;
  }

  async findPaginatedByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: data as unknown as PortalUserDocument[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
