import { Body, Controller, Headers, HttpCode, Logger, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { WebhookService } from '../services/webhook.service';

@ApiTags('Webhooks')
@Controller({ path: 'webhooks', version: '1' })
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('quickbooks')
  @HttpCode(200)
  @SkipThrottle()
  @ApiOperation({ summary: 'QuickBooks real-time change notification webhook' })
  async handleQbWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('intuit-signature') signature: string,
    @Body() body: any,
  ): Promise<void> {
    // Always respond 200 immediately — QB drops webhooks that time out
    // Signature verification
    if (!signature) {
      this.logger.warn('[Webhook] Missing intuit-signature header — ignoring');
      return;
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.warn('[Webhook] rawBody not available — ignoring');
      return;
    }

    const valid = this.webhookService.verifySignature(rawBody, signature);
    if (!valid) {
      this.logger.warn('[Webhook] Invalid signature — ignoring');
      return;
    }

    // Process async so we return 200 immediately
    this.webhookService.processPayload(body).catch((err) => {
      this.logger.error(`[Webhook] Processing error: ${err.message}`);
    });
  }
}
