import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QbProduct, QbProductSchema } from './schemas/qb-product.schema';
import { QbProductDAO } from './daos/qb-product.dao';
import { QbProductService } from './services/qb-product.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: QbProduct.name, schema: QbProductSchema }])],
  providers: [QbProductDAO, QbProductService],
  exports: [QbProductDAO, QbProductService],
})
export class QbProductModule {}
