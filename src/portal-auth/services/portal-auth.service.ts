import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';
import { PortalUserDAO } from '../daos/portal-user.dao';
import { PortalRegisterDTO, PortalLoginDTO, PortalAuthResponseDTO } from '../dtos/portal-auth.dto';

@Injectable()
export class PortalAuthService {
  constructor(
    private readonly portalUserDAO: PortalUserDAO,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: PortalRegisterDTO): Promise<PortalAuthResponseDTO> {
    const existing = await this.portalUserDAO.findByBusinessAndEmail(dto.businessId, dto.email);
    if (existing) {
      throw new CustomError('An account with this email already exists for this portal', HttpStatusCode.CONFLICT, ApiErrorCode.AUTH, ApiErrorSubCode.CONFLICT);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.portalUserDAO.create({ businessId: dto.businessId as any, name: dto.name, email: dto.email, passwordHash, qbCustomerId: dto.qbCustomerId, isActive: true } as any);
    const portalUserId = (user as any).id;
    const token = await this.jwtService.signAsync({ sub: portalUserId, portalUserId, businessId: dto.businessId, qbCustomerId: dto.qbCustomerId || null, role: 'PORTAL' });
    return { token, portalUserId, businessId: dto.businessId, name: dto.name, email: dto.email };
  }

  async login(dto: PortalLoginDTO): Promise<PortalAuthResponseDTO> {
    const user = await this.portalUserDAO.findByBusinessAndEmail(dto.businessId, dto.email);
    if (!user) throw new CustomError('Invalid email or password', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    if (!(user as any).isActive) throw new CustomError('This account has been deactivated', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    const valid = await bcrypt.compare(dto.password, (user as any).passwordHash);
    if (!valid) throw new CustomError('Invalid email or password', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    const portalUserId = (user as any).id;
    const qbCustomerId = (user as any).qbCustomerId || null;
    const token = await this.jwtService.signAsync({ sub: portalUserId, portalUserId, businessId: dto.businessId, qbCustomerId, role: 'PORTAL' });
    return { token, portalUserId, businessId: dto.businessId, name: (user as any).name, email: dto.email };
  }

  async changePassword(portalUserId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.portalUserDAO.findById(portalUserId);
    const valid = await bcrypt.compare(currentPassword, (user as any).passwordHash);
    if (!valid) throw new CustomError('Current password is incorrect', HttpStatusCode.BAD_REQUEST, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.portalUserDAO.updateById(portalUserId, { passwordHash } as any);
  }

  // Business owner creates a portal user
  async createByBusiness(businessId: string, dto: { name: string; email: string; password: string; qbCustomerId?: string; qbCustomerName?: string }): Promise<any> {
    const existing = await this.portalUserDAO.findByBusinessAndEmail(businessId, dto.email);
    if (existing) throw new CustomError('A portal user with this email already exists', HttpStatusCode.CONFLICT, ApiErrorCode.AUTH, ApiErrorSubCode.CONFLICT);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.portalUserDAO.create({ businessId: businessId as any, name: dto.name, email: dto.email, passwordHash, qbCustomerId: dto.qbCustomerId, qbCustomerName: dto.qbCustomerName, isActive: true } as any);
    const { passwordHash: _, ...safe } = user as any;
    return safe;
  }

  async setStatus(id: string, businessId: string, isActive: boolean): Promise<void> {
    const user = await this.portalUserDAO.findByIdAndBusiness(id, businessId);
    if (!user) throw new CustomError('Portal user not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    await this.portalUserDAO.updateById(id, { isActive } as any);
  }

  async resetPassword(id: string, businessId: string, newPassword: string): Promise<void> {
    const user = await this.portalUserDAO.findByIdAndBusiness(id, businessId);
    if (!user) throw new CustomError('Portal user not found', HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.portalUserDAO.updateById(id, { passwordHash } as any);
  }

  async listByBusiness(businessId: string, page: number, limit: number) {
    const result = await this.portalUserDAO.findPaginatedByBusiness(businessId, page, limit);
    return {
      ...result,
      data: result.data.map((u: any) => {
        const { passwordHash, ...safe } = u;
        return safe;
      }),
    };
  }
}
