import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { PortalJwtAuthGuard } from 'src/common/security/guards/portal-jwt.guard';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { QbCustomerDAO } from 'src/qb-customer/daos/qb-customer.dao';
import { OrderService } from '../services/order.service';
import { CreateOrderDTO, PortalCreateOrderDTO, UpdateOrderStatusDTO } from '../dtos/order.dto';

@ApiTags('Orders')
@Controller({ version: '1' })
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly qbCustomerDAO: QbCustomerDAO,
  ) {}

  // ── Business owner routes ─────────────────────────────────────────

  @Get('orders')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all orders for this business' })
  @ApiQuery({ name: 'page',       required: false, type: Number })
  @ApiQuery({ name: 'limit',      required: false, type: Number })
  @ApiQuery({ name: 'status',     required: false, type: String })
  @ApiQuery({ name: 'search',     required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  async findAll(
    @Request() req: any,
    @Query('page')       page   = '1',
    @Query('limit')      limit  = '20',
    @Query('status')     status?: string,
    @Query('search')     search?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.orderService.findAllByBusiness(
      req.businessId,
      Math.max(1, parseInt(page)),
      Math.min(100, Math.max(1, parseInt(limit))),
      { status, search, customerId },
    );
  }

  @Get('orders/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single order by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.orderService.findByIdAndBusiness(id, req.businessId);
  }

  @Patch('orders/:id/status')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateOrderStatusDTO) {
    return this.orderService.updateStatus(id, req.businessId, dto);
  }

  @Post('orders/:id/retry-estimate')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retry QB estimate creation for a failed or skipped order' })
  async retryEstimate(@Request() req: any, @Param('id') id: string) {
    return this.orderService.retryEstimate(id, req.businessId);
  }

  // ── Portal customer routes ────────────────────────────────────────

  @Post('portal/orders')
  @ApiBearerAuth('access-token')
  @UseGuards(PortalJwtAuthGuard)
  @ApiOperation({ summary: 'Portal: place a new order' })
  async portalCreate(@Request() req: any, @Body() dto: PortalCreateOrderDTO) {
    if (!req.qbCustomerId) {
      throw new CustomError(
        "Your account isn't linked to a QuickBooks customer yet — contact the business to get set up",
        HttpStatusCode.BAD_REQUEST,
        ApiErrorCode.GENERAL,
        ApiErrorSubCode.BAD_DATA,
      );
    }

    // Look up customer name from DB so it's accurate and not user-supplied
    const customer = await this.qbCustomerDAO.findByQbId(req.businessId, req.qbCustomerId);
    const customerName = (customer as any)?.name ?? 'Unknown Customer';

    return this.orderService.createOrder(
      req.businessId,
      {
        qbCustomerId: req.qbCustomerId,
        customerName,
        lineItems: dto.lineItems,
        notes: dto.notes,
      },
      req.portalUserId,
    );
  }

  @Get('portal/orders')
  @ApiBearerAuth('access-token')
  @UseGuards(PortalJwtAuthGuard)
  @ApiOperation({ summary: 'Portal: list my orders' })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'limit',  required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async portalFindAll(
    @Request() req: any,
    @Query('page')   page   = '1',
    @Query('limit')  limit  = '20',
    @Query('status') status?: string,
  ) {
    if (!req.qbCustomerId) {
      throw new CustomError(
        "Your account isn't linked to a QuickBooks customer yet — contact the business to get set up",
        HttpStatusCode.BAD_REQUEST,
        ApiErrorCode.GENERAL,
        ApiErrorSubCode.BAD_DATA,
      );
    }
    return this.orderService.findAllByPortalUserWithCustomer(
      req.businessId,
      req.qbCustomerId,
      Math.max(1, parseInt(page)),
      Math.min(100, Math.max(1, parseInt(limit))),
      { status },
    );
  }

  @Get('portal/orders/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(PortalJwtAuthGuard)
  @ApiOperation({ summary: 'Portal: get a single order' })
  async portalFindOne(@Request() req: any, @Param('id') id: string) {
    if (!req.qbCustomerId) {
      throw new CustomError(
        "Your account isn't linked to a QuickBooks customer yet — contact the business to get set up",
        HttpStatusCode.BAD_REQUEST,
        ApiErrorCode.GENERAL,
        ApiErrorSubCode.BAD_DATA,
      );
    }
    return this.orderService.findByIdAndQbCustomer(id, req.businessId, req.qbCustomerId);
  }
}
