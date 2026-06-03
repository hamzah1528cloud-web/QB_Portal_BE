import { Injectable, Logger } from '@nestjs/common';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { isTokenExpired } from 'src/common/utils/utils';
import { BusinessDAO } from 'src/business/daos/business.dao';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbInvoiceDAO } from 'src/qb-invoice/daos/qb-invoice.dao';
import { InvoiceStatus } from 'src/qb-invoice/enums/qb-invoice.enum';
import { OrderDAO } from '../daos/order.dao';
import { CreateOrderDTO, UpdateOrderStatusDTO } from '../dtos/order.dto';
import { OrderStatus } from '../enums/order.enum';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderDAO: OrderDAO,
    private readonly businessDAO: BusinessDAO,
    private readonly qbClient: QuickBooksClient,
    private readonly qbInvoiceDAO: QbInvoiceDAO,
  ) {}

  async createOrder(businessId: string, dto: CreateOrderDTO, portalUserId?: string) {
    const totalAmount = dto.lineItems.reduce((sum, l) => sum + l.amount, 0);
    return this.orderDAO.create({
      businessId: businessId as any,
      ...(portalUserId ? { portalUserId: portalUserId as any } : {}),
      qbCustomerId: dto.qbCustomerId,
      customerName: dto.customerName,
      lineItems: dto.lineItems,
      totalAmount,
      notes: dto.notes,
      status: OrderStatus.PENDING,
    } as any);
  }

  async findAllByBusiness(businessId: string, page: number, limit: number) {
    return this.orderDAO.findPaginatedByBusiness(businessId, page, limit);
  }

  async findByIdAndBusiness(id: string, businessId: string) {
    const order = await this.orderDAO.findByIdAndBusiness(id, businessId);
    if (!order) {
      throw new CustomError('Order not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    return order;
  }

  async findAllByPortalUser(businessId: string, portalUserId: string, page: number, limit: number) {
    return this.orderDAO.findPaginatedByPortalUser(businessId, portalUserId, page, limit);
  }

  async findByIdAndPortalUser(id: string, businessId: string, portalUserId: string) {
    const order = await this.orderDAO.findByIdAndPortalUser(id, businessId, portalUserId);
    if (!order) {
      throw new CustomError('Order not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    return order;
  }

  async updateStatus(id: string, businessId: string, dto: UpdateOrderStatusDTO) {
    const order = await this.orderDAO.findByIdAndBusiness(id, businessId);
    if (!order) {
      throw new CustomError('Order not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }

    this.validateTransition((order as any).status, dto.status);

    // On CONFIRMED: create QB invoice and sync it back
    if (dto.status === OrderStatus.CONFIRMED) {
      const qbInvoiceId = await this.createQbInvoiceForOrder(businessId, order as any);
      return this.orderDAO.updateById(id, { status: dto.status, qbInvoiceId } as any);
    }

    return this.orderDAO.updateById(id, { status: dto.status } as any);
  }

  private validateTransition(current: OrderStatus, next: OrderStatus): void {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]:    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]:  [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]:    [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]:  [],
      [OrderStatus.CANCELLED]:  [],
    };

    if (!allowed[current]?.includes(next)) {
      throw new CustomError(
        `Cannot transition order from ${current} to ${next}`,
        HttpStatusCode.BAD_REQUEST,
        ApiErrorCode.GENERAL,
        ApiErrorSubCode.BAD_DATA,
      );
    }
  }

  private async createQbInvoiceForOrder(businessId: string, order: any): Promise<string> {
    const business = await this.businessDAO.findById(businessId);

    if (!(business as any).isQbConnected) {
      throw new CustomError('QuickBooks is not connected — cannot create invoice', HttpStatusCode.BAD_REQUEST, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_NOT_CONNECTED);
    }

    let { qbAccessToken, qbRefreshToken, qbTokenExpiresAt, qbRealmId } = business as any;

    if (isTokenExpired(qbTokenExpiresAt)) {
      this.logger.log(`[Order] QB token expired, refreshing for business ${businessId}`);
      const tokens = await this.qbClient.refreshTokens(qbRefreshToken);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const refreshExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000);
      await this.businessDAO.updateQbTokens(businessId, {
        qbAccessToken: tokens.access_token,
        qbRefreshToken: tokens.refresh_token,
        qbTokenExpiresAt: expiresAt,
        qbRefreshTokenExpiresAt: refreshExpiresAt,
        isQbConnected: true,
      });
      qbAccessToken = tokens.access_token;
    }

    const qbInvoice = await this.qbClient.createInvoice(qbAccessToken, qbRealmId, {
      qbCustomerId: order.qbCustomerId,
      lineItems: order.lineItems.map((l: any) => ({
        qbItemId: l.qbItemId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        amount: l.amount,
        description: l.productName,
      })),
      customerMemo: order.notes,
    });

    // Upsert directly into qb_invoices without a separate sync round-trip
    const balance = qbInvoice.Balance ?? qbInvoice.TotalAmt ?? 0;
    await this.qbInvoiceDAO.upsertByQbId(businessId, qbInvoice.Id, {
      invoiceNumber: qbInvoice.DocNumber,
      txnDate: qbInvoice.TxnDate ? new Date(qbInvoice.TxnDate) : new Date(),
      dueDate: qbInvoice.DueDate ? new Date(qbInvoice.DueDate) : undefined,
      qbCustomerId: order.qbCustomerId,
      customerName: order.customerName,
      lineItems: order.lineItems.map((l: any) => ({
        qbItemId: l.qbItemId,
        description: l.productName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        amount: l.amount,
      })),
      subtotal: order.totalAmount,
      taxAmount: 0,
      totalAmount: qbInvoice.TotalAmt || order.totalAmount,
      balance,
      status: balance === 0 ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
    });

    this.logger.log(`[Order] QB invoice ${qbInvoice.Id} created and synced for order ${order.id}`);
    return qbInvoice.Id;
  }
}
