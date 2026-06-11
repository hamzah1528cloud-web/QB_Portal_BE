import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from 'src/common/security/guards/jwt-auth.guard';
import { PortalAuthService } from '../services/portal-auth.service';

class CreatePortalUserDTO {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() qbCustomerId?: string;
  @IsOptional() @IsString() qbCustomerName?: string;
}

class LinkPortalUserDTO {
  @IsString() @IsNotEmpty() qbCustomerId: string;
  @IsString() @IsNotEmpty() qbCustomerName: string;
}

@ApiTags('Portal Users (Business)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'portal-users', version: '1' })
export class PortalUsersController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Get()
  @ApiOperation({ summary: 'List all portal users for this business' })
  @ApiQuery({ name: 'page',         required: false, type: Number })
  @ApiQuery({ name: 'limit',        required: false, type: Number })
  @ApiQuery({ name: 'search',       required: false, type: String })
  @ApiQuery({ name: 'isActive',     required: false, type: Boolean })
  @ApiQuery({ name: 'qbCustomerId', required: false, type: String })
  async list(
    @Request() req: any,
    @Query('page')         page     = '1',
    @Query('limit')        limit    = '20',
    @Query('search')       search?:   string,
    @Query('isActive')     isActive?: string,
    @Query('qbCustomerId') qbCustomerId?: string,
  ) {
    return this.portalAuthService.listByBusiness(
      req.businessId,
      Math.max(1, parseInt(page)),
      Math.min(100, Math.max(1, parseInt(limit))),
      {
        search,
        isActive: isActive === undefined ? undefined : isActive === 'true',
        qbCustomerId,
      },
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a portal user — returns generated username + password' })
  async create(@Request() req: any, @Body() dto: CreatePortalUserDTO) {
    return this.portalAuthService.createByBusiness(req.businessId, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(@Request() req: any, @Param('id') id: string) {
    await this.portalAuthService.setStatus(id, req.businessId, false);
    return { message: 'Portal user deactivated' };
  }

  @Patch(':id/activate')
  async activate(@Request() req: any, @Param('id') id: string) {
    await this.portalAuthService.setStatus(id, req.businessId, true);
    return { message: 'Portal user activated' };
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Reset password — returns new plain password to share with customer' })
  async resetPassword(@Request() req: any, @Param('id') id: string) {
    return this.portalAuthService.resetPassword(id, req.businessId);
  }

  @Patch(':id/link')
  @ApiOperation({ summary: 'Link a (self-registered) portal user to a QuickBooks customer' })
  async link(@Request() req: any, @Param('id') id: string, @Body() dto: LinkPortalUserDTO) {
    await this.portalAuthService.linkToCustomer(id, req.businessId, dto.qbCustomerId, dto.qbCustomerName);
    return { message: 'Portal user linked to customer' };
  }

  @Patch(':id/unlink')
  @ApiOperation({ summary: 'Unlink a portal user from its QuickBooks customer' })
  async unlink(@Request() req: any, @Param('id') id: string) {
    await this.portalAuthService.unlinkFromCustomer(id, req.businessId);
    return { message: 'Portal user unlinked from customer' };
  }
}
