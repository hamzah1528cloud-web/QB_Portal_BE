import { Injectable } from '@nestjs/common';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { QbCustomerDAO } from '../daos/qb-customer.dao';

@Injectable()
export class QbCustomerService {
  constructor(private readonly qbCustomerDAO: QbCustomerDAO) {}

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    return this.qbCustomerDAO.findAllByBusiness(businessId, page, limit);
  }

  async findByIdAndBusiness(id: string, businessId: string) {
    const customer = await this.qbCustomerDAO.findByIdAndBusiness(id, businessId);
    if (!customer) {
      throw new CustomError('Customer not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    return customer;
  }
}
