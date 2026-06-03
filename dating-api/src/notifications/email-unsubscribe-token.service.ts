import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { EmailNotificationConfigService } from './email-notification-config.service';

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type UnsubscribePayload = {
  userId: string;
  exp: number;
};

@Injectable()
export class EmailUnsubscribeTokenService {
  constructor(private readonly config: EmailNotificationConfigService) {}

  sign(userId: string): string {
    const secret = this.requireSecret();
    const payload: UnsubscribePayload = {
      userId,
      exp: Date.now() + TOKEN_TTL_MS,
    };
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = createHmac('sha256', secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  verify(token: string): { userId: string } | null {
    const secret = this.config.unsubscribeSecret?.trim();
    if (!secret || !token?.includes('.')) {
      return null;
    }

    const [body, sig] = token.split('.', 2);
    if (!body || !sig) {
      return null;
    }

    const expected = createHmac('sha256', secret).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }

    let payload: UnsubscribePayload;
    try {
      payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as UnsubscribePayload;
    } catch {
      return null;
    }

    if (
      typeof payload.userId !== 'string' ||
      !payload.userId.trim() ||
      typeof payload.exp !== 'number' ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return { userId: payload.userId };
  }

  buildUnsubscribeUrl(userId: string): string {
    const token = this.sign(userId);
    return `${this.config.appPublicUrl}/api/v1/notifications/email/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  private requireSecret(): string {
    const secret = this.config.unsubscribeSecret?.trim();
    if (!secret) {
      throw new Error('EMAIL_UNSUBSCRIBE_SECRET is required to sign unsubscribe links');
    }
    return secret;
  }
}
