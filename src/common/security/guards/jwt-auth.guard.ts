import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../../config/secrets';
import { CustomError } from '../../errors/api.error';
import { ApiErrorCode } from '../../enums/codes/api-error.enum';
import { ApiErrorSubCode } from '../../enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from '../../enums/codes/http-error-code.enum';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new CustomError('No auth token provided', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: JWT_SECRET });

      if (payload.role === 'PORTAL') {
        throw new CustomError('Invalid token type', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
      }

      request.user = payload;
      request.businessId = payload.businessId;
      return true;
    } catch (err) {
      if (err instanceof CustomError) throw err;
      this.logger.warn(`JWT verification failed: ${err.message}`);
      throw new CustomError('Invalid or expired token', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    }
  }
}
