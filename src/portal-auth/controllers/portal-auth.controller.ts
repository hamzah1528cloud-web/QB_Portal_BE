import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PortalJwtAuthGuard } from 'src/common/security/guards/portal-jwt.guard';
import { PortalAuthService } from '../services/portal-auth.service';
import { PortalLoginDTO, PortalRegisterDTO } from '../dtos/portal-auth.dto';

class ChangePasswordDTO {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

@ApiTags('Portal Auth')
@Controller({ path: 'portal-auth', version: '1' })
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Portal customer self-registration — creates an account not yet linked to a QuickBooks customer' })
  async register(@Body() dto: PortalRegisterDTO) {
    return this.portalAuthService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Portal customer login — username + password only' })
  async login(@Body() dto: PortalLoginDTO) {
    return this.portalAuthService.login(dto);
  }

  @Post('change-password')
  @ApiBearerAuth('access-token')
  @UseGuards(PortalJwtAuthGuard)
  @ApiOperation({ summary: 'Change portal user password' })
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDTO) {
    await this.portalAuthService.changePassword(req.portalUserId, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }
}
