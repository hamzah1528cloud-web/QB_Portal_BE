import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortalUser, PortalUserSchema } from './schemas/portal-user.schema';
import { PortalUserDAO } from './daos/portal-user.dao';
import { PortalAuthService } from './services/portal-auth.service';
import { PortalAuthController } from './controllers/portal-auth.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: PortalUser.name, schema: PortalUserSchema }])],
  controllers: [PortalAuthController],
  providers: [PortalUserDAO, PortalAuthService],
  exports: [PortalUserDAO, PortalAuthService],
})
export class PortalAuthModule {}
