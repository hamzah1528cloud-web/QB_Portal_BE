import { Controller, Delete, Get, Query, Redirect, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { SkipResultInterceptor } from 'src/common/decorators/skip-result-interceptor.decorator';
import { FRONTEND_URL } from 'src/common/config/secrets';
import { AuthService } from '../services/auth.service';

@ApiTags('Auth - QuickBooks')
@Controller({ path: 'auth/quickbooks', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @SkipResultInterceptor()
  @ApiOperation({ summary: 'Redirect to QuickBooks OAuth consent screen' })
  @Redirect()
  initiateQbOAuth(@Request() req: any) {
    const url = this.authService.generateQbAuthUrl(req.businessId);
    return { url };
  }

  @Get('callback')
  @SkipResultInterceptor()
  @ApiOperation({ summary: 'Handle Intuit OAuth callback, exchange code for tokens' })
  @Redirect()
  async handleCallback(
    @Query('code') code: string,
    @Query('realmId') realmId: string,
    @Query('state') state: string,
  ) {
    await this.authService.handleQbCallback(code, realmId, state);
    return { url: `${FRONTEND_URL}/dashboard?qb=connected` };
  }

  @Get('status')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get QuickBooks connection status' })
  async getStatus(@Request() req: any) {
    return this.authService.getQbStatus(req.businessId);
  }

  @Delete('disconnect')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disconnect QuickBooks and revoke tokens' })
  async disconnect(@Request() req: any) {
    await this.authService.disconnectQb(req.businessId);
    return { message: 'QuickBooks disconnected successfully' };
  }
}
