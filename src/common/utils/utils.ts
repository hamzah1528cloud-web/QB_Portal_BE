export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() >= new Date(expiresAt);
}

export function tokenExpiresInSeconds(expiresAt: Date): number {
  return Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
}
