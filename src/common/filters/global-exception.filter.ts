import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CustomError } from '../errors/api.error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof CustomError) {
      const res = exception.getResponse() as any;
      status = exception.getStatus();
      message = res?.errors?.[0] || exception.message;
      this.logger.error(`CustomError: ${message}`);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' ? (res as any).message || exception.message : exception.message;
      this.logger.error(`HttpException: ${message}`);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`RuntimeError: ${message}`, exception.stack);
    }

    response.status(status).json({
      result: null,
      errors: Array.isArray(message) ? message : [message],
      status,
    });
  }
}
