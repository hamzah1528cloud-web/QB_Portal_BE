import { Injectable } from '@nestjs/common';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { QbProductDAO } from '../daos/qb-product.dao';

@Injectable()
export class QbProductService {
  constructor(private readonly qbProductDAO: QbProductDAO) {}

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    return this.qbProductDAO.findAllByBusiness(businessId, page, limit);
  }

  async findByIdAndBusiness(id: string, businessId: string) {
    const product = await this.qbProductDAO.findByIdAndBusiness(id, businessId);
    if (!product) {
      throw new CustomError('Product not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    return product;
  }
}
