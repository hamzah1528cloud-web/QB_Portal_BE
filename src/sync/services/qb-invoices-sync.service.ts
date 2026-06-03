import { Injectable, Logger } from '@nestjs/common';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbInvoiceDAO } from 'src/qb-invoice/daos/qb-invoice.dao';
import { InvoiceStatus } from 'src/qb-invoice/enums/qb-invoice.enum';

interface QBInvoiceLine {
  DetailType?: string;
  Description?: string;
  Amount?: number;
  SalesItemLineDetail?: {
    ItemRef?: { value?: string };
    Qty?: number;
    UnitPrice?: number;
  };
}

interface QBInvoice {
  Id: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  CustomerRef?: { value?: string; name?: string };
  Line?: QBInvoiceLine[];
  TotalAmt?: number;
  Balance?: number;
  TxnTaxDetail?: { TotalTax?: number };
  CustomerMemo?: { value?: string };
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
        invoices.map((inv) => {
          const salesLines = (inv.Line || []).filter(
            (l) => l.DetailType === 'SalesItemLineDetail' && l.SalesItemLineDetail,
          );
          const subtotal = salesLines.reduce((sum, l) => sum + (l.Amount || 0), 0);
          const taxAmount = inv.TxnTaxDetail?.TotalTax ?? 0;
          const balance = inv.Balance ?? 0;

          let status: InvoiceStatus;
          if (balance === 0) {
            status = InvoiceStatus.PAID;
          } else if (inv.DueDate && new Date(inv.DueDate) < new Date()) {
            status = InvoiceStatus.OVERDUE;
          } else {
            status = InvoiceStatus.OPEN;
          }

          return this.qbInvoiceDAO.upsertByQbId(businessId, inv.Id, {
            invoiceNumber: inv.DocNumber,
            txnDate: inv.TxnDate ? new Date(inv.TxnDate) : undefined,
            dueDate: inv.DueDate ? new Date(inv.DueDate) : undefined,
            qbCustomerId: inv.CustomerRef?.value,
            customerName: inv.CustomerRef?.name,
            lineItems: salesLines.map((l) => ({
              qbItemId: l.SalesItemLineDetail?.ItemRef?.value,
              description: l.Description,
              quantity: l.SalesItemLineDetail?.Qty,
              unitPrice: l.SalesItemLineDetail?.UnitPrice,
              amount: l.Amount,
            })),
            subtotal,
            taxAmount,
            totalAmount: inv.TotalAmt || 0,
            balance,
            status,
            customerMemo: inv.CustomerMemo?.value,
          });
        }),
      );

      totalSynced += invoices.length;
      if (invoices.length < pageSize) break;
      startPosition += pageSize;
    }

    this.logger.log(`[Sync] Synced ${totalSynced} invoices for business ${businessId}`);
    return totalSynced;
  }
}
