import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { QbInvoiceService } from '../services/qb-invoice.service';

@ApiTags('QB Invoices')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'qb-invoices', version: '1' })
export class QbInvoiceController {
  constructor(private readonly qbInvoiceService: QbInvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all invoices synced from QuickBooks' })
  async findAll(@Request() req: any) {
    return this.qbInvoiceService.findAllByBusiness(req.businessId);
  }
}
