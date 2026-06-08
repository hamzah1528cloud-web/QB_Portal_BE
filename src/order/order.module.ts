import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from 'src/business/business.module';
import { QbCustomerModule } from 'src/qb-customer/qb-customer.module';
import { QbProductModule } from 'src/qb-product/qb-product.module';
import { QuickBooksModule } from 'src/external/quickbooks/quickbooks.module';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrderDAO } from './daos/order.dao';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    forwardRef(() => BusinessModule),
    QbCustomerModule,
    QbProductModule,
    QuickBooksModule,
  ],
  controllers: [OrderController],
  providers: [OrderDAO, OrderService],
  exports: [OrderDAO, OrderService],
})
export class OrderModule {}
