import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipResultInterceptor } from './common/decorators/skip-result-interceptor.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @SkipResultInterceptor()
  health() {
    return { status: 'ok', version: 'cicd-live-1', timestamp: new Date().toISOString() };
  }
}
