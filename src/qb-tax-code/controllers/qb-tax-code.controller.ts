import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { QbTaxCodeService } from '../services/qb-tax-code.service';

@ApiTags('QB Tax Codes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'qb-tax-codes', version: '1' })
export class QbTaxCodeController {
  constructor(private readonly qbTaxCodeService: QbTaxCodeService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated tax codes synced from QuickBooks' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.qbTaxCodeService.findAllByBusiness(req.businessId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }
}
