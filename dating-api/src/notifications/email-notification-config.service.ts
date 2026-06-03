import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function trimOrUndefined(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  return t === '' || t == null ? undefined : t;
}

@Injectable()
export class EmailNotificationConfigService {
  constructor(private readonly config: ConfigService) {}

  /** `resend` sends via Resend; anything else uses noop (local dev default). */
  get provider(): 'resend' | 'disabled' {
    const raw = this.config.get<string>('EMAIL_PROVIDER')?.trim().toLowerCase();
    return raw === 'resend' ? 'resend' : 'disabled';
  }

  get resendApiKey(): string | undefined {
    return trimOrUndefined(this.config.get<string>('RESEND_API_KEY'));
  }

  get emailFrom(): string | undefined {
    return trimOrUndefined(this.config.get<string>('EMAIL_FROM'));
  }

  /** UI origin for deep links (Next.js proxies `/api` in dev). */
  get appPublicUrl(): string {
    return (
      trimOrUndefined(this.config.get<string>('APP_PUBLIC_URL')) ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  get unsubscribeSecret(): string | undefined {
    return trimOrUndefined(this.config.get<string>('EMAIL_UNSUBSCRIBE_SECRET'));
  }

  get messageDebounceMinutes(): number {
    const raw = this.config.get<string>('EMAIL_MESSAGE_DEBOUNCE_MINUTES');
    const n = raw != null ? Number(raw) : 15;
    return Number.isFinite(n) && n > 0 ? n : 15;
  }

  get isSendingEnabled(): boolean {
    return this.provider === 'resend';
  }
}
