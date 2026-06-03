import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';

export type QbCustomerDocument = QbCustomer & Document;

const AddressType = {
  line1: { type: String },
  city: { type: String },
  state: { type: String },
  postalCode: { type: String },
  country: { type: String },
};

@Schema({ timestamps: true })
export class QbCustomer extends BaseSchema {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  qbId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  companyName: string;

  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  phone: string;

  @Prop({ required: false, type: Object })
  billingAddress: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Prop({ required: false, type: Object })
  shippingAddress: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Prop({ required: false })
  paymentTerms: string;

  @Prop({ required: false, default: 0 })
  creditLimit: number;

  @Prop({ required: false, default: 0 })
  balance: number;

  @Prop({ required: false })
  notes: string;

  @Prop({ required: false })
  lastSyncedAt: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const QbCustomerSchema = SchemaFactory.createForClass(QbCustomer);
QbCustomerSchema.index({ businessId: 1, qbId: 1 }, { unique: true });
QbCustomerSchema.index({ businessId: 1, isActive: 1, name: 1 });
