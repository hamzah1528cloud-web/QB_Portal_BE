import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortalAuthService } from '../services/portal-auth.service';
import { PortalRegisterDTO, PortalLoginDTO } from '../dtos/portal-auth.dto';

@ApiTags('Portal Auth')
@Controller({ path: 'portal-auth', version: '1' })
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a portal customer account' })
  async register(@Body() dto: PortalRegisterDTO) {
    return this.portalAuthService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Portal customer login' })
  async login(@Body() dto: PortalLoginDTO) {
    return this.portalAuthService.login(dto);
  }
}
