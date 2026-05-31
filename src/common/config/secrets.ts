import * as dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppLoggerService } from '../logger/logger.service';

const logger = new AppLoggerService();
const env = process.env.NODE_ENV || 'development';
const rootPath = process.cwd();

const envPath =
  env === 'production' ? join(rootPath, '.env.prod') : env === 'staging' ? join(rootPath, '.env.staging') : join(rootPath, '.env');

if (existsSync(envPath)) {
  logger.log(`Using ${envPath} for NODE_ENV=${env}`);
  dotenv.config({ path: envPath });
} else {
  logger.warn(`No .env file at ${envPath} — using system environment variables`);
}

const required = ['NODE_ENV', 'PORT', 'MONGO_URI', 'REDIS_HOST', 'REDIS_PORT', 'JWT_SECRET', 'QB_CLIENT_ID', 'QB_CLIENT_SECRET', 'QB_REDIRECT_URI'];

const missing = required.filter((v) => !process.env[v]);
if (missing.length > 0) {
  logger.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

export const ENVIRONMENT = process.env.NODE_ENV;
export const PORT = process.env.PORT || '4000';

export const MONGO_URI = process.env.MONGO_URI;

export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const QB_CLIENT_ID = process.env.QB_CLIENT_ID;
export const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET;
export const QB_REDIRECT_URI = process.env.QB_REDIRECT_URI;
export const QB_ENVIRONMENT = process.env.QB_ENVIRONMENT || 'sandbox';

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

logger.log(`Environment: ${ENVIRONMENT} | Port: ${PORT} | QB: ${QB_ENVIRONMENT}`);
