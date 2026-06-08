import { Injectable } from '@nestjs/common';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { QbProductDAO } from '../daos/qb-product.dao';
import { detectOrderingUnits } from '../utils/unit-detection';

@Injectable()
export class QbProductService {
  constructor(private readonly qbProductDAO: QbProductDAO) {}

  async findAllByBusiness(businessId: string, page: number, limit: number, filters?: { search?: string; includeInactive?: boolean }) {
    return this.qbProductDAO.findAllByBusiness(businessId, page, limit, filters);
  }

  async findByIdAndBusiness(id: string, businessId: string) {
    const product = await this.qbProductDAO.findByIdAndBusiness(id, businessId);
    if (!product) {
      throw new CustomError('Product not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    return product;
  }

  async setOrderingUnits(id: string, businessId: string, units: string[]): Promise<void> {
    const product = await this.qbProductDAO.findByIdAndBusiness(id, businessId);
    if (!product) {
      throw new CustomError('Product not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    // Normalise + deduplicate
    const cleaned = [...new Set(units.map((u) => u.trim().toLowerCase()).filter(Boolean))];
    await this.qbProductDAO.setOrderingUnits(id, businessId, cleaned);
  }

  async resetOrderingUnits(id: string, businessId: string): Promise<string[]> {
    const product = await this.qbProductDAO.findByIdAndBusiness(id, businessId);
    if (!product) {
      throw new CustomError('Product not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    // Re-detect from stored fields — no QB API call needed
    const detected = detectOrderingUnits(
      {
        Id: (product as any).qbId,
        Name: (product as any).name,
        Sku: (product as any).sku,
        Type: (product as any).itemType,
      },
      new Map(), // no UOM cache available here; falls back to SKU/name parsing
    );
    await this.qbProductDAO.resetOrderingUnits(id, businessId, detected);
    return detected;
  }
}
