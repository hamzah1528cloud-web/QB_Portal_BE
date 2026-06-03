import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class PortalRegisterDTO {
  @IsString() @IsNotEmpty() businessId: string;
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsString() qbCustomerId?: string;
}

export class PortalLoginDTO {
  @IsString() @IsNotEmpty() businessId: string;
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
}

export class PortalAuthResponseDTO {
  token: string;
  portalUserId: string;
  businessId: string;
  name: string;
  email: string;
}
