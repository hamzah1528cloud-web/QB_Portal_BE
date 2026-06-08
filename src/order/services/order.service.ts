import { Injectable, Logger } from '@nestjs/common';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { isTokenExpired } from 'src/common/utils/utils';
import { BusinessDAO } from 'src/business/daos/business.dao';
import { QuickBooksClient } from 'src/external/quickbooks/quickbooks.client';
import { QbProductDAO } from 'src/qb-product/daos/qb-product.dao';
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
    private readonly qbProductDAO: QbProductDAO,
  ) {}

  async createOrder(businessId: string, dto: CreateOrderDTO, portalUserId?: string) {
    const totalAmount = dto.lineItems.reduce((sum, l) => sum + l.amount, 0);

    const order = await this.orderDAO.create({
      businessId: businessId as any,
      ...(portalUserId ? { portalUserId: portalUserId as any } : {}),
      qbCustomerId: dto.qbCustomerId,
      customerName: dto.customerName,
      lineItems: dto.lineItems,
      totalAmount,
      notes: dto.notes,
      status: OrderStatus.PENDING,
    } as any);

    // Fire-and-forget estimate creation — never blocks the order response
    this.createQbEstimateForOrder(businessId, order as any).catch((err) =>
      this.logger.error(`[Order] Background estimate creation failed for order ${(order as any).id}: ${err.message}`),
    );

    return order;
  }

  async findAllByBusiness(businessId: string, page: number, limit: number, filters?: { status?: string; search?: string }) {
    return this.orderDAO.findPaginatedByBusiness(businessId, page, limit, filters);
  }

  async findByIdAndBusiness(id: string, businessId: string) {
    const order = await this.orderDAO.findByIdAndBusiness(id, businessId);
    if (!order) {
      throw new CustomError('Order not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    return order;
  }

  async findAllByPortalUser(businessId: string, portalUserId: string, page: number, limit: number, filters?: { status?: string }) {
    return this.orderDAO.findPaginatedByPortalUser(businessId, portalUserId, page, limit, filters);
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

    if (dto.status === OrderStatus.CANCELLED) {
      await this.orderDAO.updateById(id, { status: dto.status } as any);
      // Best-effort: close the estimate in QB so it doesn't remain open
      const estimateId = (order as any).qbEstimateId;
      if (estimateId) {
        const tokens = await this.getTokensSafe(businessId);
        if (tokens) {
          // Check if estimate was already converted to invoice — if so, warn via flag
          const estimate = await this.qbClient.getEstimate(tokens.accessToken, tokens.realmId, estimateId);
          if (estimate?.TxnStatus === 'Closed' && (order as any).qbInvoiceId) {
            // Estimate already converted to invoice — can't undo, flag for dashboard
            await this.orderDAO.updateById(id, { estimateConvertedBeforeCancel: true } as any);
          } else {
            await this.qbClient.updateEstimateStatus(tokens.accessToken, tokens.realmId, estimateId, 'Rejected');
          }
        }
      }
      return this.orderDAO.findByIdAndBusiness(id, businessId);
    }

    return this.orderDAO.updateById(id, { status: dto.status } as any);
  }

  async retryEstimate(id: string, businessId: string) {
    const order = await this.orderDAO.findByIdAndBusiness(id, businessId);
    if (!order) {
      throw new CustomError('Order not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    if (!(order as any).qbEstimateFailed && !(order as any).qbSkipped) {
      throw new CustomError('Estimate does not need a retry', HttpStatusCode.BAD_REQUEST, ApiErrorCode.GENERAL, ApiErrorSubCode.BAD_DATA);
    }
    await this.createQbEstimateForOrder(businessId, order as any);
    return this.orderDAO.findByIdAndBusiness(id, businessId);
  }

  // Called by the webhook service when QB fires an Estimate status change
  async applyQbEstimateStatus(businessId: string, qbEstimateId: string, qbStatus: string, linkedInvoiceId?: string): Promise<void> {
    const order = await this.orderDAO.findByQbEstimateId(businessId, qbEstimateId);
    if (!order) return; // Estimate not created by us — ignore

    const currentStatus: OrderStatus = (order as any).status;

    if (currentStatus === OrderStatus.DELIVERED || currentStatus === OrderStatus.CANCELLED) return;

    const update: Record<string, any> = {};

    if (qbStatus === 'Accepted' && currentStatus === OrderStatus.PENDING) {
      update.status = OrderStatus.CONFIRMED;
    } else if (qbStatus === 'Closed' && currentStatus === OrderStatus.PENDING) {
      update.status = OrderStatus.CONFIRMED;
      if (linkedInvoiceId) update.qbInvoiceId = linkedInvoiceId;
    } else if (qbStatus === 'Rejected' && [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(currentStatus)) {
      update.status = OrderStatus.CANCELLED;
    }

    if (Object.keys(update).length > 0) {
      await this.orderDAO.updateById((order as any).id, update as any);
      this.logger.log(`[Order] QB webhook updated order ${(order as any).id}: ${currentStatus} → ${update.status ?? currentStatus}`);
    }
  }

  // Called by the webhook service when a new QB Invoice is created that references our estimate
  async applyQbInvoiceLinked(businessId: string, qbEstimateId: string, qbInvoiceId: string): Promise<void> {
    const order = await this.orderDAO.findByQbEstimateId(businessId, qbEstimateId);
    if (!order) return;
    if ((order as any).qbInvoiceId) return; // Already linked — idempotent

    const update: Record<string, any> = { qbInvoiceId };
    const currentStatus: OrderStatus = (order as any).status;
    if (currentStatus === OrderStatus.PENDING) update.status = OrderStatus.CONFIRMED;

    await this.orderDAO.updateById((order as any).id, update as any);
    this.logger.log(`[Order] QB invoice ${qbInvoiceId} linked to order ${(order as any).id}`);
  }

  // ── Portal routes ──────────────────────────────────────────────────

  async findAllByPortalUserWithCustomer(businessId: string, qbCustomerId: string, page: number, limit: number, filters?: { status?: string }) {
    return this.orderDAO.findPaginatedByQbCustomer(businessId, qbCustomerId, page, limit, filters);
  }

  async findByIdAndQbCustomer(id: string, businessId: string, qbCustomerId: string) {
    const order = await this.orderDAO.findByIdAndQbCustomer(id, businessId, qbCustomerId);
    if (!order) {
      throw new CustomError('Order not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    return order;
  }

  // ── Private helpers ────────────────────────────────────────────────

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

  private async getTokensSafe(businessId: string): Promise<{ accessToken: string; realmId: string } | null> {
    try {
      const business = await this.businessDAO.findById(businessId);
      if (!(business as any).isQbConnected) return null;

      let { qbAccessToken, qbRefreshToken, qbTokenExpiresAt, qbRealmId } = business as any;

      if (isTokenExpired(qbTokenExpiresAt)) {
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

      return { accessToken: qbAccessToken, realmId: qbRealmId };
    } catch {
      return null;
    }
  }

  private async createQbEstimateForOrder(businessId: string, order: any): Promise<void> {
    const orderId = order.id;

    const business = await this.businessDAO.findById(businessId);

    if (!(business as any).isQbConnected) {
      await this.orderDAO.updateById(orderId, { qbSkipped: true } as any);
      this.logger.log(`[Order] QB not connected — estimate skipped for order ${orderId}`);
      return;
    }

    let { qbAccessToken, qbRefreshToken, qbTokenExpiresAt, qbRealmId } = business as any;

    try {
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
    } catch (err) {
      // Refresh token expired — mark QB as disconnected
      await this.businessDAO.updateById(businessId, { isQbConnected: false } as any);
      await this.orderDAO.updateById(orderId, { qbEstimateFailed: true } as any);
      this.logger.error(`[Order] QB refresh token expired for business ${businessId} — disconnecting`);
      return;
    }

    try {
      // Enrich line items with product descriptions from DB
      const enrichedLineItems = await Promise.all(
        order.lineItems.map(async (l: any) => {
          const product = await this.qbProductDAO.findByQbIdAndBusiness(l.qbItemId, businessId).catch(() => null);
          return {
            qbItemId: l.qbItemId,
            productName: l.productName,
            productDescription: (product as any)?.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amount: l.amount,
            unit: l.unit,
          };
        }),
      );

      const estimate = await this.qbClient.createEstimate(qbAccessToken, qbRealmId, {
        qbCustomerId: order.qbCustomerId,
        lineItems: enrichedLineItems,
        notes: order.notes,
      });

      await this.orderDAO.updateById(orderId, {
        qbEstimateId: estimate.Id,
        qbEstimateNumber: estimate.DocNumber,
        qbEstimateFailed: false,
        qbSkipped: false,
      } as any);

      this.logger.log(`[Order] QB estimate ${estimate.Id} (${estimate.DocNumber}) created for order ${orderId}`);
    } catch (err) {
      await this.orderDAO.updateById(orderId, { qbEstimateFailed: true } as any);
      this.logger.error(`[Order] QB estimate creation failed for order ${orderId}: ${err.message}`);
    }
  }
}
