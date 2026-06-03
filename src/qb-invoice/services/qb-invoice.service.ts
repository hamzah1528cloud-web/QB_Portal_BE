import { Injectable } from '@nestjs/common';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { QbInvoiceDAO } from '../daos/qb-invoice.dao';

@Injectable()
export class QbInvoiceService {
  constructor(private readonly qbInvoiceDAO: QbInvoiceDAO) {}

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    return this.qbInvoiceDAO.findAllByBusiness(businessId, page, limit);
  }

  async findByIdAndBusiness(id: string, businessId: string) {
    const invoice = await this.qbInvoiceDAO.findByIdAndBusiness(id, businessId);
    if (!invoice) {
      throw new CustomError('Invoice not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    return invoice;
  }
}
