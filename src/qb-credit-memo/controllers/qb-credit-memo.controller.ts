import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { QbCreditMemoService } from '../services/qb-credit-memo.service';

@ApiTags('QB Credit Memos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'qb-credit-memos', version: '1' })
export class QbCreditMemoController {
  constructor(private readonly qbCreditMemoService: QbCreditMemoService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated credit memos synced from QuickBooks' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.qbCreditMemoService.findAllByBusiness(req.businessId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }
}
