import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CombinedAuthGuard } from 'src/common/security/guards/combined-auth.guard';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { QbCustomerService } from '../services/qb-customer.service';

@ApiTags('QB Customers')
@ApiBearerAuth('access-token')
@Controller({ path: 'qb-customers', version: '1' })
export class QbCustomerController {
  constructor(private readonly qbCustomerService: QbCustomerService) {}

  @Get()
  @UseGuards(CombinedAuthGuard)
  @ApiOperation({ summary: 'Get paginated customers synced from QuickBooks' })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'limit',  required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Request() req: any,
    @Query('page')   page   = '1',
    @Query('limit')  limit  = '20',
    @Query('search') search?: string,
  ) {
    return this.qbCustomerService.findAllByBusiness(
      req.businessId,
      Math.max(1, parseInt(page)),
      Math.min(100, Math.max(1, parseInt(limit))),
      search,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single customer by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.qbCustomerService.findByIdAndBusiness(id, req.businessId);
  }
}
