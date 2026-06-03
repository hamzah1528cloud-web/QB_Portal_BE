import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';

export type QbCreditMemoDocument = QbCreditMemo & Document;

@Schema({ timestamps: true })
export class QbCreditMemo extends BaseSchema {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  qbId: string;

  @Prop({ required: false })
  memoNumber: string;

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
  totalAmount: number;

  @Prop({ required: false, default: 0 })
  remainingCredit: number;

  @Prop({ required: false })
  txnDate: Date;

  @Prop({ required: false })
  lastSyncedAt: Date;
}

export const QbCreditMemoSchema = SchemaFactory.createForClass(QbCreditMemo);
QbCreditMemoSchema.index({ businessId: 1, qbId: 1 }, { unique: true });
