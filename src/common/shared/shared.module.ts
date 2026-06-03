import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/secrets';
import { AppLoggerService } from '../logger/logger.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { PortalJwtAuthGuard } from '../security/guards/portal-jwt.guard';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN as any },
    }),
  ],
  providers: [AppLoggerService, JwtAuthGuard, PortalJwtAuthGuard],
  exports: [JwtModule, AppLoggerService, JwtAuthGuard, PortalJwtAuthGuard],
})
export class SharedModule {}
