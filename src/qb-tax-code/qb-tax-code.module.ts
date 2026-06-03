import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QbTaxCode, QbTaxCodeSchema } from './schemas/qb-tax-code.schema';
import { QbTaxCodeDAO } from './daos/qb-tax-code.dao';
import { QbTaxCodeService } from './services/qb-tax-code.service';
import { QbTaxCodeController } from './controllers/qb-tax-code.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: QbTaxCode.name, schema: QbTaxCodeSchema }])],
  controllers: [QbTaxCodeController],
  providers: [QbTaxCodeDAO, QbTaxCodeService],
  exports: [QbTaxCodeDAO, QbTaxCodeService],
})
export class QbTaxCodeModule {}
