import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { QbCustomerService } from '../services/qb-customer.service';

@ApiTags('QB Customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'qb-customers', version: '1' })
export class QbCustomerController {
  constructor(private readonly qbCustomerService: QbCustomerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers synced from QuickBooks' })
  async findAll(@Request() req: any) {
    return this.qbCustomerService.findAllByBusiness(req.businessId);
  }
}
