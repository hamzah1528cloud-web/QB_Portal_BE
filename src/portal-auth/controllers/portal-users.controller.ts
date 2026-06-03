import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { PortalAuthService } from '../services/portal-auth.service';

class CreatePortalUserDTO {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsString() qbCustomerId?: string;
}

class ResetPasswordDTO {
  @IsString() @MinLength(8) newPassword: string;
}

@ApiTags('Portal Users (Business)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'portal-users', version: '1' })
export class PortalUsersController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Get()
  @ApiOperation({ summary: 'List all portal users for this business' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.portalAuthService.listByBusiness(req.businessId, Math.max(1, parseInt(page)), Math.min(100, Math.max(1, parseInt(limit))));
  }

  @Post()
  @ApiOperation({ summary: 'Create a portal user for a customer' })
  async create(@Request() req: any, @Body() dto: CreatePortalUserDTO) {
    return this.portalAuthService.createByBusiness(req.businessId, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a portal user' })
  async deactivate(@Request() req: any, @Param('id') id: string) {
    await this.portalAuthService.setStatus(id, req.businessId, false);
    return { message: 'Portal user deactivated' };
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivate a portal user' })
  async activate(@Request() req: any, @Param('id') id: string) {
    await this.portalAuthService.setStatus(id, req.businessId, true);
    return { message: 'Portal user activated' };
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Reset a portal user password' })
  async resetPassword(@Request() req: any, @Param('id') id: string, @Body() dto: ResetPasswordDTO) {
    await this.portalAuthService.resetPassword(id, req.businessId, dto.newPassword);
    return { message: 'Password reset successfully' };
  }
}
