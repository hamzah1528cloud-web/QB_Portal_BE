import { Injectable } from '@nestjs/common';
import { QbCustomerDAO } from '../daos/qb-customer.dao';

@Injectable()
export class QbCustomerService {
  constructor(private readonly qbCustomerDAO: QbCustomerDAO) {}

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    return this.qbCustomerDAO.findAllByBusiness(businessId, page, limit);
  }
}
