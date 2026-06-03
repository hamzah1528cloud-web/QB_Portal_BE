import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from 'src/common/config/secrets';

export const QB_SYNC_QUEUE = 'qb-sync';

export const QbSyncJob = {
  FULL_SYNC:         'full-sync',
  SYNC_CUSTOMERS:    'sync-customers',
  SYNC_PRODUCTS:     'sync-products',
  SYNC_INVOICES:     'sync-invoices',
  SYNC_PAYMENTS:     'sync-payments',
  SYNC_CREDIT_MEMOS: 'sync-credit-memos',
  SYNC_TAX_CODES:    'sync-tax-codes',
} as const;

export type QbSyncJobType = typeof QbSyncJob[keyof typeof QbSyncJob];

// Maps QB entity names (from webhook payload) to our sync job types
export const QB_ENTITY_TO_JOB: Record<string, QbSyncJobType> = {
  Customer:   QbSyncJob.SYNC_CUSTOMERS,
  Item:       QbSyncJob.SYNC_PRODUCTS,
  Invoice:    QbSyncJob.SYNC_INVOICES,
  Payment:    QbSyncJob.SYNC_PAYMENTS,
  CreditMemo: QbSyncJob.SYNC_CREDIT_MEMOS,
  TaxCode:    QbSyncJob.SYNC_TAX_CODES,
};

export const getRedisConfig = () => ({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
});
