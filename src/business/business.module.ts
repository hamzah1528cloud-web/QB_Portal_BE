import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Business, BusinessSchema } from './schemas/business.schema';
import { BusinessDAO } from './daos/business.dao';
import { BusinessService } from './services/business.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Business.name, schema: BusinessSchema }])],
  providers: [BusinessDAO, BusinessService],
  exports: [BusinessDAO, BusinessService],
})
export class BusinessModule {}
