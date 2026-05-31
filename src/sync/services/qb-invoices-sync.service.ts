import { Injectable, Logger } from '@nestjs/common';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbInvoiceDAO } from 'src/qb-invoice/daos/qb-invoice.dao';
import { InvoiceStatus } from 'src/qb-invoice/enums/qb-invoice.enum';

interface QBInvoice {
  Id: string;
  DocNumber?: string;
  CustomerRef?: { value?: string };
  Line?: { Description?: string; Amount?: number; SalesItemLineDetail?: { ItemRef?: { value?: string }; Qty?: number; UnitPrice?: number } }[];
  TotalAmt?: number;
  DueDate?: string;
  Balance?: number;
  EmailStatus?: string;
}

@Injectable()
export class QbInvoicesSyncService {
  private readonly logger = new Logger(QbInvoicesSyncService.name);

  constructor(
    private readonly qbClient: QuickBooksClient,
    private readonly qbInvoiceDAO: QbInvoiceDAO,
  ) {}

  async syncAll(businessId: string, accessToken: string, realmId: string): Promise<number> {
    this.logger.log(`[Sync] Fetching invoices for business ${businessId}`);
    let startPosition = 1;
    const pageSize = 100;
    let totalSynced = 0;

    while (true) {
      const response = await this.qbClient.query<{ Invoice?: QBInvoice[] }>(
        accessToken,
        realmId,
        `SELECT * FROM Invoice STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`,
      );

      const invoices = response.Invoice || [];
      if (invoices.length === 0) break;

      await Promise.all(
        invoices.map((inv) =>
          this.qbInvoiceDAO.upsertByQbId(businessId, inv.Id, {
            invoiceNumber: inv.DocNumber,
            qbCustomerId: inv.CustomerRef?.value,
            lineItems: (inv.Line || [])
              .filter((l) => l.SalesItemLineDetail)
              .map((l) => ({
                qbItemId: l.SalesItemLineDetail?.ItemRef?.value,
                description: l.Description,
                quantity: l.SalesItemLineDetail?.Qty,
                unitPrice: l.SalesItemLineDetail?.UnitPrice,
                amount: l.Amount,
              })),
            totalAmount: inv.TotalAmt || 0,
            dueDate: inv.DueDate ? new Date(inv.DueDate) : undefined,
            status: inv.Balance === 0 ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
          }),
        ),
      );

      totalSynced += invoices.length;
      if (invoices.length < pageSize) break;
      startPosition += pageSize;
    }

    this.logger.log(`[Sync] Synced ${totalSynced} invoices for business ${businessId}`);
    return totalSynced;
  }
}
