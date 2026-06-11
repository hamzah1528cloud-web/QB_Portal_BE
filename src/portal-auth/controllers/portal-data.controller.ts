import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PortalJwtAuthGuard } from 'src/common/security/guards/portal-jwt.guard';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { QbCustomerDAO } from 'src/qb-customer/daos/qb-customer.dao';
import { QbInvoiceDAO } from 'src/qb-invoice/daos/qb-invoice.dao';
import { QbPaymentDAO } from 'src/qb-payment/daos/qb-payment.dao';
import { QbCreditMemoDAO } from 'src/qb-credit-memo/daos/qb-credit-memo.dao';

@ApiTags('Portal Data')
@ApiBearerAuth('access-token')
@UseGuards(PortalJwtAuthGuard)
@Controller({ version: '1' })
export class PortalDataController {
  constructor(
    private readonly qbCustomerDAO: QbCustomerDAO,
    private readonly qbInvoiceDAO: QbInvoiceDAO,
    private readonly qbPaymentDAO: QbPaymentDAO,
    private readonly qbCreditMemoDAO: QbCreditMemoDAO,
  ) {}

  private requireQbCustomerId(req: any): string {
    const id = req.qbCustomerId;
    if (!id) throw new CustomError("Your account isn't linked to a QuickBooks customer yet — contact the business to get set up", HttpStatusCode.BAD_REQUEST, ApiErrorCode.GENERAL, ApiErrorSubCode.BAD_DATA);
    return id;
  }

  @Get('portal/account')
  @ApiOperation({ summary: 'Portal: get my QB customer profile' })
  async getAccount(@Request() req: any) {
    const qbCustomerId = this.requireQbCustomerId(req);
    const customer = await this.qbCustomerDAO.findByQbId(req.businessId, qbCustomerId);
    if (!customer) throw new CustomError('Customer profile not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    return customer;
  }

  @Get('portal/invoices')
  @ApiOperation({ summary: 'Portal: get my invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getInvoices(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    const qbCustomerId = this.requireQbCustomerId(req);
    return this.qbInvoiceDAO.findPaginatedByQbCustomer(req.businessId, qbCustomerId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }

  @Get('portal/payments')
  @ApiOperation({ summary: 'Portal: get my payments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPayments(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    const qbCustomerId = this.requireQbCustomerId(req);
    return this.qbPaymentDAO.findPaginatedByQbCustomer(req.businessId, qbCustomerId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }

  @Get('portal/credit-memos')
  @ApiOperation({ summary: 'Portal: get my credit memos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCreditMemos(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    const qbCustomerId = this.requireQbCustomerId(req);
    return this.qbCreditMemoDAO.findPaginatedByQbCustomer(req.businessId, qbCustomerId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }
}
