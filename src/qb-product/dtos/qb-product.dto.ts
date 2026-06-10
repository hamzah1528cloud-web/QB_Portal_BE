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
  units: string[];
}

export class UpdateProductDTO {
  name?:        string;
  description?: string;
  sku?:         string;
  unitPrice?:   number;
}

export class CreateProductDTO {
  name: string;
  type: 'Inventory' | 'Service' | 'NonInventory';
  unitPrice: number;
  incomeAccountId: string;
  description?: string;
  sku?: string;
  purchaseCost?: number;
  expenseAccountId?: string;
  qtyOnHand?: number;
  parentItemId?: string; // QB ID of parent item — creates a sub-item
}
