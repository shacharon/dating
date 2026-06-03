import { Injectable } from '@nestjs/common';
import { EmailNotificationConfigService } from './email-notification-config.service';
import type { EmailProvider } from './email-provider.interface';
import { NoopEmailProvider } from './noop-email.provider';
import { ResendEmailProvider } from './resend-email.provider';

@Injectable()
export class EmailProviderResolver {
  constructor(
    private readonly config: EmailNotificationConfigService,
    private readonly resend: ResendEmailProvider,
    private readonly noop: NoopEmailProvider,
  ) {}

  resolve(): EmailProvider {
    return this.config.provider === 'resend' ? this.resend : this.noop;
  }
}
