import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/secrets';
import { AppLoggerService } from '../logger/logger.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  providers: [AppLoggerService, JwtAuthGuard],
  exports: [JwtModule, AppLoggerService, JwtAuthGuard],
})
export class SharedModule {}
