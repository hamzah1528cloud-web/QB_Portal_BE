import { Injectable } from '@nestjs/common';
import { QbInvoiceDAO } from '../daos/qb-invoice.dao';

@Injectable()
export class QbInvoiceService {
  constructor(private readonly qbInvoiceDAO: QbInvoiceDAO) {}

  async findAllByBusiness(businessId: string) {
    return this.qbInvoiceDAO.findAllByBusiness(businessId);
  }
}
