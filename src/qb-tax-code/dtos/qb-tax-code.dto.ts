export class QbTaxCodeDTO {
  id: string;
  businessId: string;
  qbId: string;
  name: string;
  description?: string;
  active: boolean;
  taxable: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
