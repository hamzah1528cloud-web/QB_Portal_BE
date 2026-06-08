import { Injectable, Logger } from '@nestjs/common';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbProductDAO } from 'src/qb-product/daos/qb-product.dao';
import { detectOrderingUnits, QBItemForUnitDetection } from 'src/qb-product/utils/unit-detection';

interface QBItem extends QBItemForUnitDetection {
  Description?: string;
  UnitPrice?: number;
  QtyOnHand?: number;
  SalesTaxCodeRef?: { value?: string };
  PurchaseCost?: number;
  PurchaseDesc?: string;
  IncomeAccountRef?: { value?: string; name?: string };
  ExpenseAccountRef?: { value?: string; name?: string };
  Active?: boolean;
}

interface QBUOMSet {
  Id: string;
  Name: string;
  BaseUnit: { Name: string };
  UOMConvUnit?: { Name: string; ConvUnit: number }[];
}

@Injectable()
export class QbProductsSyncService {
  private readonly logger = new Logger(QbProductsSyncService.name);

  constructor(
    private readonly qbClient: QuickBooksClient,
    private readonly qbProductDAO: QbProductDAO,
  ) {}

  async syncAll(businessId: string, accessToken: string, realmId: string): Promise<number> {
    this.logger.log(`[Sync] Fetching products for business ${businessId}`);
    let startPosition = 1;
    const pageSize = 100;
    let totalSynced = 0;
    const allItems: QBItem[] = [];

    // Collect all items first so we can batch-fetch UOM sets
    while (true) {
      const response = await this.qbClient.query<{ Item?: QBItem[] }>(
        accessToken,
        realmId,
        `SELECT * FROM Item WHERE Active = true AND Type IN ('Inventory', 'Service', 'NonInventory') STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`,
      );

      const items = response.Item || [];
      if (items.length === 0) break;
      allItems.push(...items);
      if (items.length < pageSize) break;
      startPosition += pageSize;
    }

    // Batch-fetch unique UOM sets (only one API call per unique set ID)
    const uomSetCache = await this.fetchUomSets(accessToken, realmId, allItems);

    await Promise.all(
      allItems.map((item) => this.upsertItem(businessId, item, uomSetCache)),
    );

    totalSynced = allItems.length;
    this.logger.log(`[Sync] Synced ${totalSynced} products for business ${businessId}`);
    return totalSynced;
  }

  private async fetchUomSets(accessToken: string, realmId: string, items: QBItem[]): Promise<Map<string, string[]>> {
    const cache = new Map<string, string[]>();
    const uniqueSetIds = [...new Set(
      items
        .map((i) => i.UnitOfMeasureSetRef?.value)
        .filter((id): id is string => !!id),
    )];

    if (uniqueSetIds.length === 0) return cache;

    await Promise.all(
      uniqueSetIds.map(async (setId) => {
        try {
          const response = await this.qbClient.query<{ UOMSet?: QBUOMSet[] }>(
            accessToken,
            realmId,
            `SELECT * FROM UOMSet WHERE Id = '${setId}'`,
          );
          const set = response.UOMSet?.[0];
          if (!set) return;

          const units: string[] = [];
          if (set.BaseUnit?.Name) units.push(set.BaseUnit.Name.trim().toLowerCase());
          set.UOMConvUnit?.forEach((u) => {
            const n = u.Name.trim().toLowerCase();
            if (!units.includes(n)) units.push(n);
          });
          if (units.length > 0) cache.set(setId, units);
        } catch {
          // UOM set unavailable (tier restriction or deleted) — silently skip
          this.logger.warn(`[Sync] Could not fetch UOM set ${setId} — skipping`);
        }
      }),
    );

    return cache;
  }

  private async upsertItem(businessId: string, item: QBItem, uomSetCache: Map<string, string[]>): Promise<void> {
    const detectedUnits = detectOrderingUnits(item, uomSetCache);

    const baseData: Record<string, any> = {
      name: item.Name,
      itemType: item.Type,
      description: item.Description,
      sku: item.Sku,
      price: item.UnitPrice || 0,
      stockQuantity: item.Type === 'Inventory' ? (item.QtyOnHand || 0) : 0,
      taxCode: item.SalesTaxCodeRef?.value,
      purchaseCost: item.PurchaseCost ?? 0,
      purchaseDescription: item.PurchaseDesc,
      incomeAccountName: item.IncomeAccountRef?.name,
      expenseAccountName: item.ExpenseAccountRef?.name,
      isActive: item.Active !== false,
    };

    await this.qbProductDAO.upsertByQbIdConditionalUnits(businessId, item.Id, baseData, detectedUnits);
  }
}
