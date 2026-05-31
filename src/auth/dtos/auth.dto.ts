export class QbConnectionStatusDTO {
  isConnected: boolean;
  connectedAt?: Date;
  lastSyncedAt?: Date;
  realmId?: string;
}

export class RegisterBusinessDTO {
  name: string;
  email: string;
  password: string;
}

export class LoginBusinessDTO {
  email: string;
  password: string;
}
