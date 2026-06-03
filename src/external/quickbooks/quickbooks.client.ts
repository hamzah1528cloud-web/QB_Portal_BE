import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { QB_CLIENT_ID, QB_CLIENT_SECRET, QB_ENVIRONMENT } from 'src/common/config/secrets';
import { CustomError } from 'src/common/errors/api.error';
import { ApiErrorCode } from 'src/common/enums/codes/api-error.enum';
import { ApiErrorSubCode } from 'src/common/enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from 'src/common/enums/codes/http-error-code.enum';

const QB_BASE_URL = QB_ENVIRONMENT === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com';

const QB_AUTH_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export interface QBTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

@Injectable()
export class QuickBooksClient {
  private readonly logger = new Logger(QuickBooksClient.name);

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: QB_CLIENT_ID,
      redirect_uri: process.env.QB_REDIRECT_URI,
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      state,
    });
    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<QBTokenResponse> {
    const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');
    try {
      const response = await axios.post(
        QB_AUTH_URL,
        new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: process.env.QB_REDIRECT_URI }),
        { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return response.data;
    } catch (err) {
      this.logger.error(`Failed to exchange auth code: ${err.message}`);
      throw new CustomError('Failed to exchange QuickBooks auth code', HttpStatusCode.BAD_REQUEST, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_API_ERROR);
    }
  }

  async refreshTokens(refreshToken: string): Promise<QBTokenResponse> {
    const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');
    try {
      const response = await axios.post(
        QB_AUTH_URL,
        new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
        { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return response.data;
    } catch (err) {
      this.logger.error(`Failed to refresh QB tokens: ${err.message}`);
      throw new CustomError('QuickBooks token refresh failed — please reconnect', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_TOKEN_EXPIRED);
    }
  }

  async revokeToken(token: string): Promise<void> {
    const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');
    try {
      await axios.post(
        'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
        new URLSearchParams({ token }),
        { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
    } catch (err) {
      this.logger.warn(`QB token revocation failed (continuing): ${err.message}`);
    }
  }

  buildApiClient(accessToken: string, realmId: string): AxiosInstance {
    return axios.create({
      baseURL: `${QB_BASE_URL}/v3/company/${realmId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async createInvoice(
    accessToken: string,
    realmId: string,
    payload: {
      qbCustomerId: string;
      lineItems: { qbItemId: string; quantity: number; unitPrice: number; amount: number; description?: string }[];
      customerMemo?: string;
    },
  ): Promise<{ Id: string; DocNumber?: string; TotalAmt?: number; Balance?: number; TxnDate?: string; DueDate?: string }> {
    const client = this.buildApiClient(accessToken, realmId);
    try {
      const body = {
        CustomerRef: { value: payload.qbCustomerId },
        Line: payload.lineItems.map((l) => ({
          DetailType: 'SalesItemLineDetail',
          Amount: l.amount,
          Description: l.description,
          SalesItemLineDetail: {
            ItemRef: { value: l.qbItemId },
            Qty: l.quantity,
            UnitPrice: l.unitPrice,
          },
        })),
        ...(payload.customerMemo ? { CustomerMemo: { value: payload.customerMemo } } : {}),
      };
      const response = await client.post('/invoice?minorversion=70', body);
      return response.data.Invoice;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        throw new CustomError('QB access token expired', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_TOKEN_EXPIRED);
      }
      this.logger.error(`QB createInvoice failed: ${err.response?.data?.Fault?.Error?.[0]?.Message || err.message}`);
      throw new CustomError('Failed to create QuickBooks invoice', HttpStatusCode.INTERNAL_SERVER_ERROR, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_API_ERROR);
    }
  }

  async query<T>(accessToken: string, realmId: string, query: string): Promise<T> {
    const client = this.buildApiClient(accessToken, realmId);
    try {
      const response = await client.get('/query', { params: { query, minorversion: 70 } });
      return response.data.QueryResponse as T;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        throw new CustomError('QB access token expired', HttpStatusCode.UNAUTHORIZED, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_TOKEN_EXPIRED);
      }
      this.logger.error(`QB query failed: ${err.message}`);
      throw new CustomError(`QuickBooks query failed: ${err.message}`, HttpStatusCode.INTERNAL_SERVER_ERROR, ApiErrorCode.QUICKBOOKS, ApiErrorSubCode.QB_API_ERROR);
    }
  }
}
