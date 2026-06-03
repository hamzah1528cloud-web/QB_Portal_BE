import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';
import { InvoiceStatus } from '../enums/qb-invoice.enum';

export type QbInvoiceDocument = QbInvoice & Document;

@Schema({ timestamps: true })
export class QbInvoice extends BaseSchema {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  qbId: string;

  @Prop({ required: false })
  invoiceNumber: string;

  @Prop({ required: false, type: Types.ObjectId, ref: 'QbCustomer' })
  customerId: Types.ObjectId;

  @Prop({ required: false })
  qbCustomerId: string;

  @Prop({ required: false })
  customerName: string;

  @Prop({ required: false, type: Array, default: [] })
  lineItems: {
    qbItemId?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }[];

  @Prop({ required: false, default: 0 })
  subtotal: number;

  @Prop({ required: false, default: 0 })
  taxAmount: number;

  @Prop({ required: false, default: 0 })
  totalAmount: number;

  @Prop({ required: false, default: 0 })
  balance: number;

  @Prop({ required: false })
  txnDate: Date;

  @Prop({ required: false })
  dueDate: Date;

  @Prop({ required: false, enum: InvoiceStatus, default: InvoiceStatus.OPEN })
  status: InvoiceStatus;

  @Prop({ required: false })
  customerMemo: string;

  @Prop({ required: false })
  lastSyncedAt: Date;
}

export const QbInvoiceSchema = SchemaFactory.createForClass(QbInvoice);
QbInvoiceSchema.index({ businessId: 1, qbId: 1 }, { unique: true });
QbInvoiceSchema.index({ businessId: 1, status: 1 });
QbInvoiceSchema.index({ businessId: 1, qbCustomerId: 1 });
