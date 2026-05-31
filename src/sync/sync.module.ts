import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BusinessModule } from 'src/business/business.module';
import { QbCustomerModule } from 'src/qb-customer/qb-customer.module';
import { QbProductModule } from 'src/qb-product/qb-product.module';
import { QbInvoiceModule } from 'src/qb-invoice/qb-invoice.module';
import { QB_SYNC_QUEUE, getRedisConfig } from './constants/queue.constants';
import { SyncController } from './controllers/sync.controller';
import { SyncProcessor } from './processors/sync.processor';
import { SyncService } from './services/sync.service';
import { QbCustomersSyncService } from './services/qb-customers-sync.service';
import { QbProductsSyncService } from './services/qb-products-sync.service';
import { QbInvoicesSyncService } from './services/qb-invoices-sync.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QB_SYNC_QUEUE, redis: getRedisConfig() }),
    forwardRef(() => BusinessModule),
    QbCustomerModule,
    QbProductModule,
    QbInvoiceModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncProcessor, QbCustomersSyncService, QbProductsSyncService, QbInvoicesSyncService],
  exports: [SyncService],
})
export class SyncModule {}
