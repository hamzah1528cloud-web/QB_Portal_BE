import { Body, Controller, Delete, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CombinedAuthGuard } from 'src/common/security/guards/combined-auth.guard';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { QbProductService } from '../services/qb-product.service';
import { UpdateProductUnitsDTO } from '../dtos/qb-product.dto';

@ApiTags('QB Products')
@ApiBearerAuth('access-token')
@UseGuards(CombinedAuthGuard)
@Controller({ path: 'qb-products', version: '1' })
export class QbProductController {
  constructor(private readonly qbProductService: QbProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated products synced from QuickBooks' })
  @ApiQuery({ name: 'page',            required: false, type: Number })
  @ApiQuery({ name: 'limit',           required: false, type: Number })
  @ApiQuery({ name: 'search',          required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @Request() req: any,
    @Query('page')            page            = '1',
    @Query('limit')           limit           = '20',
    @Query('search')          search?:          string,
    @Query('includeInactive') includeInactive = 'false',
  ) {
    return this.qbProductService.findAllByBusiness(
      req.businessId,
      Math.max(1, parseInt(page)),
      Math.min(100, Math.max(1, parseInt(limit))),
      { search, includeInactive: includeInactive === 'true' },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single product by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.qbProductService.findByIdAndBusiness(id, req.businessId);
  }

  @Patch(':id/units')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set ordering units for a product (business owner only)' })
  async setUnits(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProductUnitsDTO) {
    await this.qbProductService.setOrderingUnits(id, req.businessId, dto.units);
    return { message: 'Ordering units updated' };
  }

  @Delete(':id/units')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset ordering units to QB-detected defaults (business owner only)' })
  async resetUnits(@Request() req: any, @Param('id') id: string) {
    const units = await this.qbProductService.resetOrderingUnits(id, req.businessId);
    return { orderingUnits: units };
  }
}
