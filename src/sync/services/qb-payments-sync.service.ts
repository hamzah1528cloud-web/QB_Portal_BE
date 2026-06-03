import { Injectable, Logger } from '@nestjs/common';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbPaymentDAO } from 'src/qb-payment/daos/qb-payment.dao';

interface QBPayment {
  Id: string;
  CustomerRef?: { value?: string; name?: string };
  TotalAmt?: number;
  UnappliedAmt?: number;
  TxnDate?: string;
  PaymentMethodRef?: { name?: string };
  Line?: { Amount?: number; LinkedTxn?: { TxnId?: string; TxnType?: string }[] }[];
}

@Injectable()
export class QbPaymentsSyncService {
  private readonly logger = new Logger(QbPaymentsSyncService.name);

  constructor(
    private readonly qbClient: QuickBooksClient,
    private readonly qbPaymentDAO: QbPaymentDAO,
  ) {}

  async syncAll(businessId: string, accessToken: string, realmId: string): Promise<number> {
    this.logger.log(`[Sync] Fetching payments for business ${businessId}`);
    let startPosition = 1;
    const pageSize = 100;
    let totalSynced = 0;

    while (true) {
      const response = await this.qbClient.query<{ Payment?: QBPayment[] }>(
        accessToken,
        realmId,
        `SELECT * FROM Payment STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`,
      );

      const payments = response.Payment || [];
      if (payments.length === 0) break;

      await Promise.all(
        payments.map((p) =>
          this.qbPaymentDAO.upsertByQbId(businessId, p.Id, {
            qbCustomerId: p.CustomerRef?.value,
            customerName: p.CustomerRef?.name,
            totalAmount: p.TotalAmt || 0,
            unappliedAmount: p.UnappliedAmt || 0,
            txnDate: p.TxnDate ? new Date(p.TxnDate) : undefined,
            paymentMethod: p.PaymentMethodRef?.name,
            linkedInvoiceIds: (p.Line || [])
              .flatMap((l) => l.LinkedTxn || [])
              .filter((t) => t.TxnType === 'Invoice' && t.TxnId)
              .map((t) => t.TxnId!),
          }),
        ),
      );

      totalSynced += payments.length;
      if (payments.length < pageSize) break;
      startPosition += pageSize;
    }

    this.logger.log(`[Sync] Synced ${totalSynced} payments for business ${businessId}`);
    return totalSynced;
  }
}
