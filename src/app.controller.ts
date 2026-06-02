import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SkipResultInterceptor } from './common/decorators/skip-result-interceptor.decorator';
import { LANDING_PAGE } from './common/landing/landing.html';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @SkipResultInterceptor()
  root(@Res() res: Response) {
    res.removeHeader('Content-Security-Policy');
    res.type('html').send(LANDING_PAGE);
  }

  @Get('health')
  @SkipResultInterceptor()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
