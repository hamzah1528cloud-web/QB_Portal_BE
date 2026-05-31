import { HttpException } from '@nestjs/common';
import { ENVIRONMENT } from '../config/secrets';
import { ApiErrorCode } from '../enums/codes/api-error.enum';
import { ApiErrorSubCode } from '../enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from '../enums/codes/http-error-code.enum';

export class CustomError extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatusCode,
    apiErrorCode: ApiErrorCode,
    apiErrorSubCode: ApiErrorSubCode | string,
    errorStack?: string,
  ) {
    const showStack = ENVIRONMENT === 'development' || ENVIRONMENT === 'staging';

    const response: any = {
      errors: [message],
      status: statusCode,
      errorDetails: { apiErrorCode, apiErrorSubCode: apiErrorSubCode.toString() },
    };

    if (showStack && errorStack) {
      response.stack = errorStack;
    }

    super(response, statusCode);
  }
}
