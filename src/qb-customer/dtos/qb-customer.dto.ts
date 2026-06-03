export class QbCustomerDTO {
  id: string;
  businessId: string;
  qbId: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shippingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  paymentTerms?: string;
  creditLimit?: number;
  balance?: number;
  notes?: string;
  lastSyncedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
