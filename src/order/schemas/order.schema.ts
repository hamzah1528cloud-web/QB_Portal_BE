import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';
import { OrderStatus } from '../enums/order.enum';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order extends BaseSchema {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'PortalUser' })
  portalUserId: Types.ObjectId;

  @Prop({ required: true })
  qbCustomerId: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true, type: Array })
  lineItems: {
    qbItemId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    unit?: string;
  }[];

  @Prop({ required: false, default: 0 })
  totalAmount: number;

  @Prop({ required: false, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ required: false })
  qbInvoiceId: string;

  // Estimate fields (new flow — replaces invoice creation on order placement)
  @Prop({ required: false })
  qbEstimateId: string;

  @Prop({ required: false })
  qbEstimateNumber: string;

  @Prop({ required: false, default: false })
  qbEstimateFailed: boolean;

  // True when QB was not connected at the time the order was placed
  @Prop({ required: false, default: false })
  qbSkipped: boolean;

  // True when the order was cancelled but the estimate had already been converted to a QB invoice
  @Prop({ required: false, default: false })
  estimateConvertedBeforeCancel: boolean;

  @Prop({ required: false })
  notes: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ businessId: 1, status: 1 });
OrderSchema.index({ businessId: 1, portalUserId: 1 });
OrderSchema.index({ businessId: 1, qbCustomerId: 1 });
OrderSchema.index({ businessId: 1, qbEstimateId: 1 });
