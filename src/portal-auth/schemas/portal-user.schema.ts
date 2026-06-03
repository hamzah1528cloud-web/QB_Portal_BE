import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';

export type PortalUserDocument = PortalUser & Document;

@Schema({ timestamps: true })
export class PortalUser extends BaseSchema {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: false })
  qbCustomerId: string;

  @Prop({ required: false })
  qbCustomerName: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PortalUserSchema = SchemaFactory.createForClass(PortalUser);
PortalUserSchema.index({ businessId: 1, email: 1 }, { unique: true });
PortalUserSchema.index({ username: 1 }, { unique: true });
