import { Injectable, Logger } from '@nestjs/common';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbProductDAO } from 'src/qb-product/daos/qb-product.dao';

interface QBItem {
  Id: string;
  Name: string;
  Description?: string;
  Sku?: string;
  UnitPrice?: number;
  QtyOnHand?: number;
  SalesTaxCodeRef?: { value?: string };
  Active?: boolean;
  Type?: string;
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

    while (true) {
      const response = await this.qbClient.query<{ Item?: QBItem[] }>(
        accessToken,
        realmId,
        `SELECT * FROM Item WHERE Active = true AND Type IN ('Inventory', 'Service', 'NonInventory') STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`,
      );

      const items = response.Item || [];
      if (items.length === 0) break;

      await Promise.all(
        items.map((item) =>
          this.qbProductDAO.upsertByQbId(businessId, item.Id, {
            name: item.Name,
            description: item.Description,
            sku: item.Sku,
            price: item.UnitPrice || 0,
            stockQuantity: item.QtyOnHand || 0,
            taxCode: item.SalesTaxCodeRef?.value,
            isActive: item.Active !== false,
          }),
        ),
      );

      totalSynced += items.length;
      if (items.length < pageSize) break;
      startPosition += pageSize;
    }

    this.logger.log(`[Sync] Synced ${totalSynced} products for business ${businessId}`);
    return totalSynced;
  }
}
