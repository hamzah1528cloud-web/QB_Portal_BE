import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { CombinedAuthGuard } from 'src/common/security/guards/combined-auth.guard';
import { QbProductService } from '../services/qb-product.service';

@ApiTags('QB Products')
@ApiBearerAuth('access-token')
@Controller({ path: 'qb-products', version: '1' })
export class QbProductController {
  constructor(private readonly qbProductService: QbProductService) {}

  @Get()
  @UseGuards(CombinedAuthGuard)
  @ApiOperation({ summary: 'Get paginated products synced from QuickBooks' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.qbProductService.findAllByBusiness(req.businessId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }

  @Get(':id')
  @UseGuards(CombinedAuthGuard)
  @ApiOperation({ summary: 'Get a single product by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.qbProductService.findByIdAndBusiness(id, req.businessId);
  }
}
