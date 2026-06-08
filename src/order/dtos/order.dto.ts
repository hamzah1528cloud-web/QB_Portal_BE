import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../enums/order.enum';

export class OrderLineItemDTO {
  @IsString() @IsNotEmpty() qbItemId: string;
  @IsString() @IsNotEmpty() productName: string;
  @IsNumber() @Min(1) quantity: number;
  @IsNumber() @Min(0) unitPrice: number;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() unit?: string;
}

export class CreateOrderDTO {
  @IsString() @IsNotEmpty() qbCustomerId: string;
  @IsString() @IsNotEmpty() customerName: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderLineItemDTO) lineItems: OrderLineItemDTO[];
  @IsOptional() @IsString() notes?: string;
}

// Portal customers don't supply their own customer identity — it comes from the JWT
export class PortalCreateOrderDTO {
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderLineItemDTO) lineItems: OrderLineItemDTO[];
  @IsOptional() @IsString() notes?: string;
}

export class UpdateOrderStatusDTO {
  @IsEnum(OrderStatus) status: OrderStatus;
}
