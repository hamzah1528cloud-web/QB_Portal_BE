import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QbPayment, QbPaymentSchema } from './schemas/qb-payment.schema';
import { QbPaymentDAO } from './daos/qb-payment.dao';
import { QbPaymentService } from './services/qb-payment.service';
import { QbPaymentController } from './controllers/qb-payment.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: QbPayment.name, schema: QbPaymentSchema }])],
  controllers: [QbPaymentController],
  providers: [QbPaymentDAO, QbPaymentService],
  exports: [QbPaymentDAO, QbPaymentService],
})
export class QbPaymentModule {}
