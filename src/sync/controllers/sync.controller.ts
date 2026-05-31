import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { SyncService } from '../services/sync.service';

@ApiTags('Sync')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'sync', version: '1' })
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('quickbooks')
  @ApiOperation({ summary: 'Manually trigger a full QuickBooks resync' })
  async triggerSync(@Request() req: any) {
    await this.syncService.enqueueSyncForBusiness(req.businessId);
    return { message: 'Sync job enqueued successfully' };
  }
}
