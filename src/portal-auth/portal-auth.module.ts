import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QbCustomerModule } from 'src/qb-customer/qb-customer.module';
import { QbInvoiceModule } from 'src/qb-invoice/qb-invoice.module';
import { QbPaymentModule } from 'src/qb-payment/qb-payment.module';
import { QbCreditMemoModule } from 'src/qb-credit-memo/qb-credit-memo.module';
import { PortalUser, PortalUserSchema } from './schemas/portal-user.schema';
import { PortalUserDAO } from './daos/portal-user.dao';
import { PortalAuthService } from './services/portal-auth.service';
import { PortalAuthController } from './controllers/portal-auth.controller';
import { PortalUsersController } from './controllers/portal-users.controller';
import { PortalDataController } from './controllers/portal-data.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PortalUser.name, schema: PortalUserSchema }]),
    QbCustomerModule,
    QbInvoiceModule,
    QbPaymentModule,
    QbCreditMemoModule,
  ],
  controllers: [PortalAuthController, PortalUsersController, PortalDataController],
  providers: [PortalUserDAO, PortalAuthService],
  exports: [PortalUserDAO, PortalAuthService],
})
export class PortalAuthModule {}
