import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class QbProductDTO {
  id: string;
  businessId: string;
  qbId: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  stockQuantity: number;
  unitOfMeasure?: string;
  taxCode?: string;
  itemType?: string;
  purchaseCost?: number;
  purchaseDescription?: string;
  incomeAccountName?: string;
  expenseAccountName?: string;
  isActive: boolean;
  isCategory: boolean;
  isSubItem: boolean;
  parentQbId?: string;
  parentName?: string;
  orderingUnits: string[];
  unitsCustomized: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateProductUnitsDTO {
  @IsArray()
  @IsString({ each: true })
  units: string[];
}

export class UpdateProductDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class CreateProductDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['Inventory', 'Service', 'NonInventory'])
  type: 'Inventory' | 'Service' | 'NonInventory';

  @IsNumber()
  unitPrice: number;

  @IsString()
  @IsNotEmpty()
  incomeAccountId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  purchaseCost?: number;

  @IsOptional()
  @IsString()
  expenseAccountId?: string;

  // Required for type === 'Inventory' — QuickBooks rejects inventory items without an asset account
  @ValidateIf((o) => o.type === 'Inventory')
  @IsString()
  @IsNotEmpty()
  assetAccountId?: string;

  @IsOptional()
  @IsNumber()
  qtyOnHand?: number;

  @IsOptional()
  @IsString()
  parentItemId?: string; // QB ID of parent item — creates a sub-item
}
