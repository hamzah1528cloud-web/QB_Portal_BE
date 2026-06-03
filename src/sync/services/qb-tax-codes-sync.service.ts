import { Injectable, Logger } from '@nestjs/common';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbTaxCodeDAO } from 'src/qb-tax-code/daos/qb-tax-code.dao';

interface QBTaxCode {
  Id: string;
  Name: string;
  Description?: string;
  Active?: boolean;
  Taxable?: boolean;
}

@Injectable()
export class QbTaxCodesSyncService {
  private readonly logger = new Logger(QbTaxCodesSyncService.name);

  constructor(
    private readonly qbClient: QuickBooksClient,
    private readonly qbTaxCodeDAO: QbTaxCodeDAO,
  ) {}

  async syncAll(businessId: string, accessToken: string, realmId: string): Promise<number> {
    this.logger.log(`[Sync] Fetching tax codes for business ${businessId}`);

    const response = await this.qbClient.query<{ TaxCode?: QBTaxCode[] }>(
      accessToken,
      realmId,
      `SELECT * FROM TaxCode`,
    );

    const taxCodes = response.TaxCode || [];

    await Promise.all(
      taxCodes.map((t) =>
        this.qbTaxCodeDAO.upsertByQbId(businessId, t.Id, {
          name: t.Name,
          description: t.Description,
          active: t.Active !== false,
          taxable: t.Taxable === true,
        }),
      ),
    );

    this.logger.log(`[Sync] Synced ${taxCodes.length} tax codes for business ${businessId}`);
    return taxCodes.length;
  }
}
