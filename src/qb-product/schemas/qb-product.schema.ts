import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';

export type QbProductDocument = QbProduct & Document;

@Schema({ timestamps: true })
export class QbProduct extends BaseSchema {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  qbId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description: string;

  @Prop({ required: false })
  sku: string;

  @Prop({ required: false, default: 0 })
  price: number;

  @Prop({ required: false, default: 0 })
  stockQuantity: number;

  @Prop({ required: false })
  unitOfMeasure: string;

  @Prop({ required: false, default: false })
  isCategory: boolean;

  @Prop({ required: false, default: false })
  isSubItem: boolean;

  @Prop({ required: false })
  parentQbId: string;

  @Prop({ required: false })
  parentName: string;

  @Prop({ required: false })
  taxCode: string;

  @Prop({ required: false })
  itemType: string;

  @Prop({ required: false, default: 0 })
  purchaseCost: number;

  @Prop({ required: false })
  purchaseDescription: string;

  @Prop({ required: false })
  incomeAccountName: string;

  @Prop({ required: false })
  expenseAccountName: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false, type: [String], default: ['each'] })
  orderingUnits: string[];

  @Prop({ required: false, default: false })
  unitsCustomized: boolean;

  @Prop({ required: false })
  lastSyncedAt: Date;
}

export const QbProductSchema = SchemaFactory.createForClass(QbProduct);
QbProductSchema.index({ businessId: 1, qbId: 1 }, { unique: true });
QbProductSchema.index({ businessId: 1, isActive: 1, name: 1 });
