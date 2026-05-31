import { Injectable } from '@nestjs/common';
import { BusinessDAO } from '../daos/business.dao';
import { BusinessDocument } from '../schemas/business.schema';

@Injectable()
export class BusinessService {
  constructor(private readonly businessDAO: BusinessDAO) {}

  async findById(id: string): Promise<BusinessDocument> {
    return this.businessDAO.findById(id) as Promise<BusinessDocument>;
  }

  async findByEmail(email: string): Promise<BusinessDocument | null> {
    return this.businessDAO.findByEmail(email);
  }

  async create(data: { name: string; email: string }): Promise<BusinessDocument> {
    return this.businessDAO.create(data) as Promise<BusinessDocument>;
  }
}
