import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';

export type QbPaymentDocument = QbPayment & Document;

@Schema({ timestamps: true })
export class QbPayment extends BaseSchema {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  qbId: string;

  @Prop({ required: false })
  qbCustomerId: string;

  @Prop({ required: false })
  customerName: string;

  @Prop({ required: false, default: 0 })
  totalAmount: number;

  @Prop({ required: false, default: 0 })
  unappliedAmount: number;

  @Prop({ required: false })
  txnDate: Date;

  @Prop({ required: false })
  paymentMethod: string;

  @Prop({ required: false, type: [String], default: [] })
  linkedInvoiceIds: string[];

  @Prop({ required: false })
  lastSyncedAt: Date;
}

export const QbPaymentSchema = SchemaFactory.createForClass(QbPayment);
QbPaymentSchema.index({ businessId: 1, qbId: 1 }, { unique: true });
