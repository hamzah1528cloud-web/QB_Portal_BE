import { InvoiceStatus } from '../enums/qb-invoice.enum';

export class QbInvoiceDTO {
  id: string;
  businessId: string;
  qbId: string;
  invoiceNumber?: string;
  customerId?: string;
  qbCustomerId?: string;
  lineItems: {
    qbItemId?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }[];
  totalAmount: number;
  dueDate?: Date;
  status: InvoiceStatus;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
