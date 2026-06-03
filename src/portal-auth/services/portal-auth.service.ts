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
    const user = await this.portalUserDAO.create({
      businessId: dto.businessId as any,
      name: dto.name,
      email: dto.email,
      passwordHash,
      qbCustomerId: dto.qbCustomerId,
      isActive: true,
    } as any);

    const portalUserId = (user as any).id;
    const token = await this.jwtService.signAsync({ sub: portalUserId, portalUserId, businessId: dto.businessId, role: 'PORTAL' });
    return { token, portalUserId, businessId: dto.businessId, name: dto.name, email: dto.email };
  }

  async login(dto: PortalLoginDTO): Promise<PortalAuthResponseDTO> {
    const user = await this.portalUserDAO.findByBusinessAndEmail(dto.businessId, dto.email);
    if (!user) {
      throw new CustomError('Invalid email or password', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    }

    if (!(user as any).isActive) {
      throw new CustomError('This account has been deactivated', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    }

    const valid = await bcrypt.compare(dto.password, (user as any).passwordHash);
    if (!valid) {
      throw new CustomError('Invalid email or password', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.AUTH, ApiErrorSubCode.UNAUTHORIZED);
    }

    const portalUserId = (user as any).id;
    const token = await this.jwtService.signAsync({ sub: portalUserId, portalUserId, businessId: dto.businessId, role: 'PORTAL' });
    return { token, portalUserId, businessId: dto.businessId, name: (user as any).name, email: dto.email };
  }
}
