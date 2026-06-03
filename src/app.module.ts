import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MONGO_URI } from './common/config/secrets';
import { getRedisConfig } from './sync/constants/queue.constants';
import { SharedModule } from './common/shared/shared.module';
import { ResultInterceptor } from './common/security/interceptors/result.interceptor';
import { QuickBooksModule } from './external/quickbooks/quickbooks.module';
import { BusinessModule } from './business/business.module';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module';
import { QbCustomerModule } from './qb-customer/qb-customer.module';
import { QbProductModule } from './qb-product/qb-product.module';
import { QbInvoiceModule } from './qb-invoice/qb-invoice.module';
import { QbPaymentModule } from './qb-payment/qb-payment.module';
import { QbCreditMemoModule } from './qb-credit-memo/qb-credit-memo.module';
import { QbTaxCodeModule } from './qb-tax-code/qb-tax-code.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRoot({ redis: getRedisConfig() }),
    MongooseModule.forRoot(MONGO_URI),
    SharedModule,
    QuickBooksModule,
    BusinessModule,
    AuthModule,
    SyncModule,
    QbCustomerModule,
    QbProductModule,
    QbInvoiceModule,
    QbPaymentModule,
    QbCreditMemoModule,
    QbTaxCodeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ResultInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
