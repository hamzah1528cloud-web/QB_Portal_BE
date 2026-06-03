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
}
