import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDTO {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDTO {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class AuthResponseDTO {
  accessToken: string;
  refreshToken: string;
  businessId: string;
  name: string;
  email: string;
}

export class RefreshDTO {
  @IsString()
  refreshToken: string;
}

export class QbConnectionStatusDTO {
  isConnected: boolean;
  connectedAt?: Date;
  lastSyncedAt?: Date;
  realmId?: string;
}
