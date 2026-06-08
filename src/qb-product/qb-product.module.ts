import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from 'src/business/business.module';
import { QuickBooksModule } from 'src/external/quickbooks/quickbooks.module';
import { QbProduct, QbProductSchema } from './schemas/qb-product.schema';
import { QbProductDAO } from './daos/qb-product.dao';
import { QbProductService } from './services/qb-product.service';
import { QbProductController } from './controllers/qb-product.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: QbProduct.name, schema: QbProductSchema }]),
    forwardRef(() => BusinessModule),
    QuickBooksModule,
  ],
  controllers: [QbProductController],
  providers: [QbProductDAO, QbProductService],
  exports: [QbProductDAO, QbProductService],
})
export class QbProductModule {}
