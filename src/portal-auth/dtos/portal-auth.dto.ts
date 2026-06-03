import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PortalLoginDTO {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}

export class PortalAuthResponseDTO {
  token: string;
  portalUserId: string;
  businessId: string;
  name: string;
  email: string;
}
