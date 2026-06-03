import { Injectable, Logger } from '@nestjs/common';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbCustomerDAO } from 'src/qb-customer/daos/qb-customer.dao';

interface QBAddress {
  Line1?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  Country?: string;
}

interface QBCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: QBAddress;
  ShipAddr?: QBAddress;
  SalesTermRef?: { name?: string };
  CreditLimit?: number;
  Balance?: number;
  Notes?: string;
  Active?: boolean;
}

function mapAddress(addr?: QBAddress) {
  if (!addr) return undefined;
  return {
    line1: addr.Line1,
    city: addr.City,
    state: addr.CountrySubDivisionCode,
    postalCode: addr.PostalCode,
    country: addr.Country,
  };
}

@Injectable()
export class QbCustomersSyncService {
  private readonly logger = new Logger(QbCustomersSyncService.name);

  constructor(
    private readonly qbClient: QuickBooksClient,
    private readonly qbCustomerDAO: QbCustomerDAO,
  ) {}

  async syncAll(businessId: string, accessToken: string, realmId: string): Promise<number> {
    this.logger.log(`[Sync] Fetching customers for business ${businessId}`);
    let startPosition = 1;
    const pageSize = 100;
    let totalSynced = 0;

    while (true) {
      const response = await this.qbClient.query<{ Customer?: QBCustomer[] }>(
        accessToken,
        realmId,
        `SELECT * FROM Customer WHERE Active = true STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`,
      );

      const customers = response.Customer || [];
      if (customers.length === 0) break;

      await Promise.all(
        customers.map((c) =>
          this.qbCustomerDAO.upsertByQbId(businessId, c.Id, {
            name: c.DisplayName,
            companyName: c.CompanyName,
            email: c.PrimaryEmailAddr?.Address,
            phone: c.PrimaryPhone?.FreeFormNumber,
            billingAddress: mapAddress(c.BillAddr),
            shippingAddress: mapAddress(c.ShipAddr),
            paymentTerms: c.SalesTermRef?.name,
            creditLimit: c.CreditLimit ?? 0,
            balance: c.Balance ?? 0,
            notes: c.Notes,
            isActive: c.Active !== false,
          }),
        ),
      );

      totalSynced += customers.length;
      if (customers.length < pageSize) break;
      startPosition += pageSize;
    }

    this.logger.log(`[Sync] Synced ${totalSynced} customers for business ${businessId}`);
    return totalSynced;
  }
}
