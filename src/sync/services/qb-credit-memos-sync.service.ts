import { Injectable, Logger } from '@nestjs/common';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbCreditMemoDAO } from 'src/qb-credit-memo/daos/qb-credit-memo.dao';

interface QBCreditMemo {
  Id: string;
  DocNumber?: string;
  CustomerRef?: { value?: string; name?: string };
  TotalAmt?: number;
  RemainingCredit?: number;
  TxnDate?: string;
  Line?: { Description?: string; Amount?: number; SalesItemLineDetail?: { ItemRef?: { value?: string }; Qty?: number; UnitPrice?: number } }[];
}

@Injectable()
export class QbCreditMemosSyncService {
  private readonly logger = new Logger(QbCreditMemosSyncService.name);

  constructor(
    private readonly qbClient: QuickBooksClient,
    private readonly qbCreditMemoDAO: QbCreditMemoDAO,
  ) {}

  async syncAll(businessId: string, accessToken: string, realmId: string): Promise<number> {
    this.logger.log(`[Sync] Fetching credit memos for business ${businessId}`);
    let startPosition = 1;
    const pageSize = 100;
    let totalSynced = 0;

    while (true) {
      const response = await this.qbClient.query<{ CreditMemo?: QBCreditMemo[] }>(
        accessToken,
        realmId,
        `SELECT * FROM CreditMemo STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`,
      );

      const memos = response.CreditMemo || [];
      if (memos.length === 0) break;

      await Promise.all(
        memos.map((m) =>
          this.qbCreditMemoDAO.upsertByQbId(businessId, m.Id, {
            memoNumber: m.DocNumber,
            qbCustomerId: m.CustomerRef?.value,
            customerName: m.CustomerRef?.name,
            lineItems: (m.Line || [])
              .filter((l) => l.SalesItemLineDetail)
              .map((l) => ({
                qbItemId: l.SalesItemLineDetail?.ItemRef?.value,
                description: l.Description,
                quantity: l.SalesItemLineDetail?.Qty,
                unitPrice: l.SalesItemLineDetail?.UnitPrice,
                amount: l.Amount,
              })),
            totalAmount: m.TotalAmt || 0,
            remainingCredit: m.RemainingCredit || 0,
            txnDate: m.TxnDate ? new Date(m.TxnDate) : undefined,
          }),
        ),
      );

      totalSynced += memos.length;
      if (memos.length < pageSize) break;
      startPosition += pageSize;
    }

    this.logger.log(`[Sync] Synced ${totalSynced} credit memos for business ${businessId}`);
    return totalSynced;
  }
}
