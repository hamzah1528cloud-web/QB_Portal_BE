import { Injectable } from '@nestjs/common';
import { QbTaxCodeDAO } from '../daos/qb-tax-code.dao';

@Injectable()
export class QbTaxCodeService {
  constructor(private readonly qbTaxCodeDAO: QbTaxCodeDAO) {}

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    return this.qbTaxCodeDAO.findAllByBusiness(businessId, page, limit);
  }
}
