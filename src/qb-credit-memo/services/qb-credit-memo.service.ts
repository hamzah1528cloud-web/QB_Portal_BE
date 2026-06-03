import { Injectable } from '@nestjs/common';
import { QbCreditMemoDAO } from '../daos/qb-credit-memo.dao';

@Injectable()
export class QbCreditMemoService {
  constructor(private readonly qbCreditMemoDAO: QbCreditMemoDAO) {}

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    return this.qbCreditMemoDAO.findAllByBusiness(businessId, page, limit);
  }
}
