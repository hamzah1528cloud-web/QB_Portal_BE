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
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
