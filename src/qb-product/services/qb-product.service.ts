import { Injectable } from '@nestjs/common';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { isTokenExpired } from 'src/common/utils/utils';
import { BusinessDAO } from 'src/business/daos/business.dao';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbProductDAO } from '../daos/qb-product.dao';
import { CreateProductDTO, UpdateProductDTO } from '../dtos/qb-product.dto';
import { detectOrderingUnits } from '../utils/unit-detection';

@Injectable()
export class QbProductService {
  constructor(
    private readonly qbProductDAO: QbProductDAO,
    private readonly businessDAO: BusinessDAO,
    private readonly qbClient: QuickBooksClient,
  ) {}

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

  async updateProduct(id: string, businessId: string, dto: UpdateProductDTO) {
    const product = await this.qbProductDAO.findByIdAndBusiness(id, businessId);
    if (!product) {
      throw new CustomError('Product not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }

    if ((product as any).isCategory) {
      throw new CustomError('Category items cannot be edited', HttpStatusCode.BAD_REQUEST, ApiErrorCode.GENERAL, ApiErrorSubCode.BAD_DATA);
    }

    // Nothing to update
    const hasChanges = Object.values(dto).some((v) => v !== undefined);
    if (!hasChanges) return product;

    const { accessToken, realmId } = await this.getTokens(businessId);
    const qbId = (product as any).qbId;

    // Fetch current SyncToken from QB — required for optimistic concurrency
    const current = await this.qbClient.getItemSyncToken(accessToken, realmId, qbId);
    if (!current) {
      throw new CustomError('Product no longer exists in QuickBooks', HttpStatusCode.NOT_FOUND, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.NOT_FOUND);
    }

    await this.qbClient.updateItem(accessToken, realmId, qbId, current.syncToken, {
      name:        dto.name,
      description: dto.description,
      sku:         dto.sku,
      unitPrice:   dto.unitPrice,
    });

    // Update our DB immediately — don't wait for the webhook
    const dbUpdate: Record<string, any> = {};
    if (dto.name        !== undefined) dbUpdate.name        = dto.name;
    if (dto.description !== undefined) dbUpdate.description = dto.description;
    if (dto.sku         !== undefined) dbUpdate.sku         = dto.sku;
    if (dto.unitPrice   !== undefined) dbUpdate.price       = dto.unitPrice;

    await this.qbProductDAO.updateById(id, dbUpdate as any);
    return this.qbProductDAO.findByIdAndBusiness(id, businessId);
  }

  async getQbAccounts(businessId: string) {
    const { accessToken, realmId } = await this.getTokens(businessId);
    const [income, expense] = await Promise.all([
      this.qbClient.getAccounts(accessToken, realmId, 'Income'),
      this.qbClient.getAccounts(accessToken, realmId, 'Cost of Goods Sold'),
    ]);
    return { income, expense };
  }

  async createProduct(businessId: string, dto: CreateProductDTO) {
    const { accessToken, realmId } = await this.getTokens(businessId);

    const qbItem = await this.qbClient.createItem(accessToken, realmId, {
      name:            dto.name,
      type:            dto.type,
      unitPrice:       dto.unitPrice,
      incomeAccountId: dto.incomeAccountId,
      description:     dto.description,
      sku:             dto.sku,
      purchaseCost:    dto.purchaseCost,
      expenseAccountId: dto.expenseAccountId,
      qtyOnHand:       dto.qtyOnHand,
      parentItemId:    dto.parentItemId,
    });

    // Fetch parent details if this is a sub-item
    let parentName: string | undefined;
    if (dto.parentItemId) {
      const parent = await this.qbProductDAO.findByQbIdAndBusiness(dto.parentItemId, businessId);
      parentName = (parent as any)?.name;
    }

    const detectedUnits = detectOrderingUnits(
      { Id: qbItem.Id, Name: qbItem.Name, Sku: dto.sku, SubItem: !!dto.parentItemId, ParentRef: parentName ? { name: parentName } : undefined },
      new Map(),
    );

    await this.qbProductDAO.upsertByQbIdConditionalUnits(businessId, qbItem.Id, {
      name:            qbItem.Name,
      itemType:        dto.type,
      description:     dto.description,
      sku:             dto.sku,
      price:           dto.unitPrice,
      stockQuantity:   dto.qtyOnHand ?? 0,
      purchaseCost:    dto.purchaseCost ?? 0,
      isActive:        true,
      isSubItem:       !!dto.parentItemId,
      parentQbId:      dto.parentItemId ?? null,
      parentName:      parentName ?? null,
    }, detectedUnits);

    return this.qbProductDAO.findByQbIdAndBusiness(qbItem.Id, businessId);
  }

  private async getTokens(businessId: string): Promise<{ accessToken: string; realmId: string }> {
    const business = await this.businessDAO.findById(businessId);
    if (!(business as any).isQbConnected) {
      throw new CustomError('QuickBooks is not connected', HttpStatusCode.BAD_REQUEST, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_NOT_CONNECTED);
    }
    let { qbAccessToken, qbRefreshToken, qbTokenExpiresAt, qbRealmId } = business as any;
    if (isTokenExpired(qbTokenExpiresAt)) {
      const tokens = await this.qbClient.refreshTokens(qbRefreshToken);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const refreshExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000);
      await this.businessDAO.updateQbTokens(businessId, {
        qbAccessToken: tokens.access_token,
        qbRefreshToken: tokens.refresh_token,
        qbTokenExpiresAt: expiresAt,
        qbRefreshTokenExpiresAt: refreshExpiresAt,
        isQbConnected: true,
      });
      qbAccessToken = tokens.access_token;
    }
    return { accessToken: qbAccessToken, realmId: qbRealmId };
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
