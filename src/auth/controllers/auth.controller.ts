import { Body, Controller, Delete, Get, Post, Query, Redirect, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { SkipResultInterceptor } from 'src/common/decorators/skip-result-interceptor.decorator';
import { FRONTEND_URL } from 'src/common/config/secrets';
import { AuthService } from '../services/auth.service';
import { LoginDTO, RegisterDTO } from '../dtos/auth.dto';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new business account' })
  async register(@Body() dto: RegisterDTO) {
    return this.authService.register(dto.name, dto.email, dto.password);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive a JWT token' })
  async login(@Body() dto: LoginDTO) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('quickbooks/connect-url')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the QuickBooks OAuth consent URL' })
  getQbConnectUrl(@Request() req: any) {
    return this.authService.getQbConnectUrl(req.businessId);
  }

  @Get('quickbooks/callback')
  @SkipResultInterceptor()
  @ApiOperation({ summary: 'Intuit OAuth callback — exchange code for tokens' })
  @Redirect()
  async handleCallback(
    @Query('code') code: string,
    @Query('realmId') realmId: string,
    @Query('state') state: string,
  ) {
    await this.authService.handleQbCallback(code, realmId, state);
    return { url: `${FRONTEND_URL}/sync?qb=connected` };
  }

  @Get('quickbooks/status')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get QuickBooks connection status' })
  async getStatus(@Request() req: any) {
    return this.authService.getQbStatus(req.businessId);
  }

  @Delete('quickbooks/disconnect')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disconnect QuickBooks and revoke tokens' })
  async disconnect(@Request() req: any) {
    await this.authService.disconnectQb(req.businessId);
    return { message: 'QuickBooks disconnected successfully' };
  }
}
