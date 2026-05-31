import { Injectable } from '@nestjs/common';
import { QbProductDAO } from '../daos/qb-product.dao';

@Injectable()
export class QbProductService {
  constructor(private readonly qbProductDAO: QbProductDAO) {}

  async findAllByBusiness(businessId: string) {
    return this.qbProductDAO.findAllByBusiness(businessId);
  }
}
