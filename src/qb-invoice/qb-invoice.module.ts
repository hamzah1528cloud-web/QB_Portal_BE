import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QbInvoice, QbInvoiceSchema } from './schemas/qb-invoice.schema';
import { QbInvoiceDAO } from './daos/qb-invoice.dao';
import { QbInvoiceService } from './services/qb-invoice.service';
import { QbInvoiceController } from './controllers/qb-invoice.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: QbInvoice.name, schema: QbInvoiceSchema }])],
  controllers: [QbInvoiceController],
  providers: [QbInvoiceDAO, QbInvoiceService],
  exports: [QbInvoiceDAO, QbInvoiceService],
})
export class QbInvoiceModule {}
