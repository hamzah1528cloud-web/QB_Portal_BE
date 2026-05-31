import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from 'src/common/config/secrets';

export const QB_SYNC_QUEUE = 'qb-sync';

export const QbSyncJob = {
  FULL_SYNC: 'full-sync',
  SYNC_CUSTOMERS: 'sync-customers',
  SYNC_PRODUCTS: 'sync-products',
  SYNC_INVOICES: 'sync-invoices',
} as const;

export const getRedisConfig = () => ({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
});
