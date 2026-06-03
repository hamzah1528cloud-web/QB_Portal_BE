export class QbCreditMemoDTO {
  id: string;
  businessId: string;
  qbId: string;
  memoNumber?: string;
  qbCustomerId?: string;
  customerName?: string;
  lineItems: {
    qbItemId?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }[];
  totalAmount: number;
  remainingCredit: number;
  txnDate?: Date;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
