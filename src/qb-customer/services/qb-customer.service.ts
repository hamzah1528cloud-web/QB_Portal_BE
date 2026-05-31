import { Injectable } from '@nestjs/common';
import { QbCustomerDAO } from '../daos/qb-customer.dao';

@Injectable()
export class QbCustomerService {
  constructor(private readonly qbCustomerDAO: QbCustomerDAO) {}

  async findAllByBusiness(businessId: string) {
    return this.qbCustomerDAO.findAllByBusiness(businessId);
  }
}
