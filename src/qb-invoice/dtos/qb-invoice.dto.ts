import { InvoiceStatus } from '../enums/qb-invoice.enum';

export class QbInvoiceDTO {
  id: string;
  businessId: string;
  qbId: string;
  invoiceNumber?: string;
  customerId?: string;
  qbCustomerId?: string;
  customerName?: string;
  lineItems: {
    qbItemId?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  balance: number;
  txnDate?: Date;
  dueDate?: Date;
  status: InvoiceStatus;
  customerMemo?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
