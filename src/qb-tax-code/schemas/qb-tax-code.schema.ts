import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';

export type QbTaxCodeDocument = QbTaxCode & Document;

@Schema({ timestamps: true })
export class QbTaxCode extends BaseSchema {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  qbId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description: string;

  @Prop({ required: false, default: true })
  active: boolean;

  @Prop({ required: false, default: false })
  taxable: boolean;

  @Prop({ required: false })
  lastSyncedAt: Date;
}

export const QbTaxCodeSchema = SchemaFactory.createForClass(QbTaxCode);
QbTaxCodeSchema.index({ businessId: 1, qbId: 1 }, { unique: true });
