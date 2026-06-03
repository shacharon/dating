import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailNotificationConfigService } from './email-notification-config.service';
import type {
  EmailProvider,
  EmailSendParams,
  EmailSendResult,
} from './email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private client: Resend | null = null;

  constructor(private readonly config: EmailNotificationConfigService) {}

  async send(params: EmailSendParams): Promise<EmailSendResult> {
    const apiKey = this.config.resendApiKey;
    const from = this.config.emailFrom;
    if (!apiKey || !from) {
      throw new Error('RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend');
    }

    if (!this.client) {
      this.client = new Resend(apiKey);
    }

    const result = await this.client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { id: result.data?.id ?? null };
  }
}
