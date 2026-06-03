import { Injectable } from '@nestjs/common';
import { QbPaymentDAO } from '../daos/qb-payment.dao';

@Injectable()
export class QbPaymentService {
  constructor(private readonly qbPaymentDAO: QbPaymentDAO) {}

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    return this.qbPaymentDAO.findAllByBusiness(businessId, page, limit);
  }
}
