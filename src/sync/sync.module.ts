import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BusinessModule } from 'src/business/business.module';
import { QbCustomerModule } from 'src/qb-customer/qb-customer.module';
import { QbProductModule } from 'src/qb-product/qb-product.module';
import { QbInvoiceModule } from 'src/qb-invoice/qb-invoice.module';
import { QbPaymentModule } from 'src/qb-payment/qb-payment.module';
import { QbCreditMemoModule } from 'src/qb-credit-memo/qb-credit-memo.module';
import { QbTaxCodeModule } from 'src/qb-tax-code/qb-tax-code.module';
import { OrderModule } from 'src/order/order.module';
import { QB_SYNC_QUEUE, getRedisConfig } from './constants/queue.constants';
import { SyncController } from './controllers/sync.controller';
import { WebhookController } from './controllers/webhook.controller';
import { SyncProcessor } from './processors/sync.processor';
import { SyncService } from './services/sync.service';
import { WebhookService } from './services/webhook.service';
import { QbCustomersSyncService } from './services/qb-customers-sync.service';
import { QbProductsSyncService } from './services/qb-products-sync.service';
import { QbInvoicesSyncService } from './services/qb-invoices-sync.service';
import { QbPaymentsSyncService } from './services/qb-payments-sync.service';
import { QbCreditMemosSyncService } from './services/qb-credit-memos-sync.service';
import { QbTaxCodesSyncService } from './services/qb-tax-codes-sync.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QB_SYNC_QUEUE, redis: getRedisConfig() }),
    forwardRef(() => BusinessModule),
    forwardRef(() => OrderModule),
    QbCustomerModule,
    QbProductModule,
    QbInvoiceModule,
    QbPaymentModule,
    QbCreditMemoModule,
    QbTaxCodeModule,
  ],
  controllers: [SyncController, WebhookController],
  providers: [
    SyncService,
    WebhookService,
    SyncProcessor,
    QbCustomersSyncService,
    QbProductsSyncService,
    QbInvoicesSyncService,
    QbPaymentsSyncService,
    QbCreditMemosSyncService,
    QbTaxCodesSyncService,
  ],
  exports: [SyncService, QbProductsSyncService],
})
export class SyncModule {}
