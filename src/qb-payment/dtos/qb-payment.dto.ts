export class QbPaymentDTO {
  id: string;
  businessId: string;
  qbId: string;
  qbCustomerId?: string;
  customerName?: string;
  totalAmount: number;
  unappliedAmount: number;
  txnDate?: Date;
  paymentMethod?: string;
  linkedInvoiceIds: string[];
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
