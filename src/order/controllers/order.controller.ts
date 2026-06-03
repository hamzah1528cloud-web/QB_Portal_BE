import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { PortalJwtAuthGuard } from 'src/common/security/guards/portal-jwt.guard';
import { OrderService } from '../services/order.service';
import { CreateOrderDTO, UpdateOrderStatusDTO } from '../dtos/order.dto';

@ApiTags('Orders')
@Controller({ version: '1' })
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ── Business owner routes ─────────────────────────────────────────

  @Get('orders')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all orders for this business' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.orderService.findAllByBusiness(req.businessId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
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
  @ApiOperation({ summary: 'Update order status (CONFIRMED triggers QB invoice creation)' })
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateOrderStatusDTO) {
    return this.orderService.updateStatus(id, req.businessId, dto);
  }

  // ── Portal customer routes ────────────────────────────────────────

  @Post('portal/orders')
  @ApiBearerAuth('access-token')
  @UseGuards(PortalJwtAuthGuard)
  @ApiOperation({ summary: 'Portal: place a new order' })
  async portalCreate(@Request() req: any, @Body() dto: CreateOrderDTO) {
    return this.orderService.createOrder(req.businessId, dto, req.portalUserId);
  }

  @Get('portal/orders')
  @ApiBearerAuth('access-token')
  @UseGuards(PortalJwtAuthGuard)
  @ApiOperation({ summary: 'Portal: list customer own orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async portalFindAll(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.orderService.findAllByPortalUser(req.businessId, req.portalUserId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }

  @Get('portal/orders/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(PortalJwtAuthGuard)
  @ApiOperation({ summary: 'Portal: get a single order' })
  async portalFindOne(@Request() req: any, @Param('id') id: string) {
    return this.orderService.findByIdAndPortalUser(id, req.businessId, req.portalUserId);
  }
}
