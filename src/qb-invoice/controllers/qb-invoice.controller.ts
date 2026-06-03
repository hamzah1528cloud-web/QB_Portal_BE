import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CombinedAuthGuard } from 'src/common/security/guards/combined-auth.guard';
import { InvoiceStatus } from '../enums/qb-invoice.enum';
import { QbInvoiceService } from '../services/qb-invoice.service';

@ApiTags('QB Invoices')
@ApiBearerAuth('access-token')
@UseGuards(CombinedAuthGuard)
@Controller({ path: 'qb-invoices', version: '1' })
export class QbInvoiceController {
  constructor(private readonly qbInvoiceService: QbInvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated invoices synced from QuickBooks' })
  @ApiQuery({ name: 'page',       required: false, type: Number })
  @ApiQuery({ name: 'limit',      required: false, type: Number })
  @ApiQuery({ name: 'status',     required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  async findAll(
    @Request() req: any,
    @Query('page')       page       = '1',
    @Query('limit')      limit      = '20',
    @Query('status')     status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.qbInvoiceService.findAllByBusiness(
      req.businessId,
      Math.max(1, parseInt(page)),
      Math.min(100, Math.max(1, parseInt(limit))),
      { status, customerId },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.qbInvoiceService.findByIdAndBusiness(id, req.businessId);
  }
}
