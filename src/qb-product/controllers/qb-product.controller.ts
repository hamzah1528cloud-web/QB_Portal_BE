import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { QbProductService } from '../services/qb-product.service';

@ApiTags('QB Products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'qb-products', version: '1' })
export class QbProductController {
  constructor(private readonly qbProductService: QbProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products synced from QuickBooks' })
  async findAll(@Request() req: any) {
    return this.qbProductService.findAllByBusiness(req.businessId);
  }
}
