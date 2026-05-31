import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from 'src/common/base/baseSchema';

export type BusinessDocument = Business & Document;

@Schema({ timestamps: true })
export class Business extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  qbRealmId: string;

  @Prop({ required: false })
  qbAccessToken: string;

  @Prop({ required: false })
  qbRefreshToken: string;

  @Prop({ required: false })
  qbTokenExpiresAt: Date;

  @Prop({ required: false })
  qbRefreshTokenExpiresAt: Date;

  @Prop({ required: false })
  qbConnectedAt: Date;

  @Prop({ required: false })
  qbLastSyncedAt: Date;

  @Prop({ default: false })
  isQbConnected: boolean;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);
