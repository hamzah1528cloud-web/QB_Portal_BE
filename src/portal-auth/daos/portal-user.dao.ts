import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseDAO } from 'src/common/base/baseDAO';
import { mapDoc, mapDocs } from 'src/common/utils/db.utils';
import { PortalUser, PortalUserDocument } from '../schemas/portal-user.schema';

@Injectable()
export class PortalUserDAO extends BaseDAO<PortalUserDocument, any> {
  constructor(@InjectModel(PortalUser.name) model: Model<PortalUserDocument>) {
    super(model);
  }

  async findByUsername(username: string): Promise<PortalUserDocument | null> {
    const doc = await this.model.findOne({ username }).lean().exec();
    return mapDoc<PortalUserDocument>(doc);
  }

  async findByBusinessAndEmail(businessId: string, email: string): Promise<PortalUserDocument | null> {
    const doc = await this.model.findOne({ businessId, email }).lean().exec();
    return mapDoc<PortalUserDocument>(doc);
  }

  async findByIdAndBusiness(id: string, businessId: string): Promise<PortalUserDocument | null> {
    const doc = await this.model.findOne({ _id: id, businessId }).lean().exec();
    return mapDoc<PortalUserDocument>(doc);
  }

  async findPaginatedByBusiness(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { businessId };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: mapDocs<PortalUserDocument>(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
