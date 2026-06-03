import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { PortalUserDAO } from '../daos/portal-user.dao';
import { PortalLoginDTO, PortalAuthResponseDTO } from '../dtos/portal-auth.dto';

function generateUsername(): string {
  return 'usr_' + crypto.randomBytes(5).toString('hex'); // e.g. usr_a3f9c12b
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function safeUser(u: any) {
  const { passwordHash, ...rest } = u;
  return rest;
}

@Injectable()
export class PortalAuthService {
  constructor(
    private readonly portalUserDAO: PortalUserDAO,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: PortalLoginDTO): Promise<PortalAuthResponseDTO> {
    const user = await this.portalUserDAO.findByUsername(dto.username);
    if (!user) throw new CustomError('Invalid username or password', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    if (!(user as any).isActive) throw new CustomError('This account has been deactivated', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    const valid = await bcrypt.compare(dto.password, (user as any).passwordHash);
    if (!valid) throw new CustomError('Invalid username or password', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    const portalUserId = (user as any).id;
    const businessId = (user as any).businessId?.toString();
    const qbCustomerId = (user as any).qbCustomerId || null;
    const token = await this.jwtService.signAsync({ sub: portalUserId, portalUserId, businessId, qbCustomerId, role: 'PORTAL' });
    return { token, portalUserId, businessId, name: (user as any).name, email: (user as any).email };
  }

  async changePassword(portalUserId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.portalUserDAO.findById(portalUserId);
    const valid = await bcrypt.compare(currentPassword, (user as any).passwordHash);
    if (!valid) throw new CustomError('Current password is incorrect', HttpStatusCode.BAD_REQUEST, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    await this.portalUserDAO.updateById(portalUserId, { passwordHash: await bcrypt.hash(newPassword, 10) } as any);
  }

  async createByBusiness(businessId: string, dto: { name: string; email: string; qbCustomerId?: string; qbCustomerName?: string }): Promise<any> {
    const existing = await this.portalUserDAO.findByBusinessAndEmail(businessId, dto.email);
    if (existing) throw new CustomError('A portal user with this email already exists', HttpStatusCode.CONFLICT, ApiErrorCode.AUTH, ApiErrorSubCode.CONFLICT);

    // Auto-generate unique username (retry on collision)
    let username = generateUsername();
    let attempts = 0;
    while (await this.portalUserDAO.findByUsername(username)) {
      username = generateUsername();
      if (++attempts > 10) throw new CustomError('Could not generate unique username', HttpStatusCode.INTERNAL_SERVER_ERROR, ApiErrorCode.GENERAL, ApiErrorSubCode.BAD_DATA);
    }

    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await this.portalUserDAO.create({
      businessId: businessId as any,
      username,
      name: dto.name,
      email: dto.email,
      passwordHash,
      qbCustomerId: dto.qbCustomerId,
      qbCustomerName: dto.qbCustomerName,
      isActive: true,
    } as any);

    // Return credentials so business owner can share them — only time plain password is visible
    return { ...safeUser(user as any), username, plainPassword };
  }

  async setStatus(id: string, businessId: string, isActive: boolean): Promise<void> {
    const user = await this.portalUserDAO.findByIdAndBusiness(id, businessId);
    if (!user) throw new CustomError('Portal user not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    await this.portalUserDAO.updateById(id, { isActive } as any);
  }

  async resetPassword(id: string, businessId: string): Promise<{ plainPassword: string }> {
    const user = await this.portalUserDAO.findByIdAndBusiness(id, businessId);
    if (!user) throw new CustomError('Portal user not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    const plainPassword = generatePassword();
    await this.portalUserDAO.updateById(id, { passwordHash: await bcrypt.hash(plainPassword, 10) } as any);
    return { plainPassword };
  }

  async listByBusiness(businessId: string, page: number, limit: number) {
    const result = await this.portalUserDAO.findPaginatedByBusiness(businessId, page, limit);
    return { ...result, data: result.data.map((u: any) => safeUser(u)) };
  }
}
