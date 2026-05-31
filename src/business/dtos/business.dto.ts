export class BusinessDTO {
  id: string;
  name: string;
  email: string;
  qbRealmId?: string;
  qbAccessToken?: string;
  qbRefreshToken?: string;
  qbTokenExpiresAt?: Date;
  qbRefreshTokenExpiresAt?: Date;
  qbConnectedAt?: Date;
  qbLastSyncedAt?: Date;
  isQbConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}
