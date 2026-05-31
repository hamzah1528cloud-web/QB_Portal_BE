import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QbCustomer, QbCustomerSchema } from './schemas/qb-customer.schema';
import { QbCustomerDAO } from './daos/qb-customer.dao';
import { QbCustomerService } from './services/qb-customer.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: QbCustomer.name, schema: QbCustomerSchema }])],
  providers: [QbCustomerDAO, QbCustomerService],
  exports: [QbCustomerDAO, QbCustomerService],
})
export class QbCustomerModule {}
