import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_RESULT_INTERCEPTOR } from '../../decorators/skip-result-interceptor.decorator';
import { CustomError } from '../../errors/api.error';
import { ApiErrorCode } from '../../enums/codes/api-error.enum';
import { ApiErrorSubCode } from '../../enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from '../../enums/codes/http-error-code.enum';

@Injectable()
export class ResultInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept<T>(context: ExecutionContext, next: CallHandler): Observable<{ result: T }> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESULT_INTERCEPTOR, [context.getHandler(), context.getClass()]);
    if (skip) return next.handle();

    return next.handle().pipe(
      map((data: T) => {
        if (data === null || data === undefined) {
          throw new CustomError('No data found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
        }
        return { result: data };
      }),
    );
  }
}
