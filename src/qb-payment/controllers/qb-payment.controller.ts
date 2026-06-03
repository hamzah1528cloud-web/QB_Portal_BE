import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { QbPaymentService } from '../services/qb-payment.service';

@ApiTags('QB Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'qb-payments', version: '1' })
export class QbPaymentController {
  constructor(private readonly qbPaymentService: QbPaymentService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated payments synced from QuickBooks' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.qbPaymentService.findAllByBusiness(req.businessId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }
}
