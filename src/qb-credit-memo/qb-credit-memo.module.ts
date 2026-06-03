import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QbCreditMemo, QbCreditMemoSchema } from './schemas/qb-credit-memo.schema';
import { QbCreditMemoDAO } from './daos/qb-credit-memo.dao';
import { QbCreditMemoService } from './services/qb-credit-memo.service';
import { QbCreditMemoController } from './controllers/qb-credit-memo.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: QbCreditMemo.name, schema: QbCreditMemoSchema }])],
  controllers: [QbCreditMemoController],
  providers: [QbCreditMemoDAO, QbCreditMemoService],
  exports: [QbCreditMemoDAO, QbCreditMemoService],
})
export class QbCreditMemoModule {}
