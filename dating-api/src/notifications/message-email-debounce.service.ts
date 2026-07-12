import { Injectable } from '@nestjs/common';
import { EmailNotificationConfigService } from './email-notification-config.service';

@Injectable()
export class MessageEmailDebounceService {
  private readonly lastSentAt = new Map<string, number>();

  constructor(private readonly config: EmailNotificationConfigService) {}

  shouldSend(conversationId: string, recipientUserId: string): boolean {
    const key = this.key(conversationId, recipientUserId);
    const last = this.lastSentAt.get(key);
    if (last == null) {
      return true;
    }
    const windowMs = this.config.messageDebounceMinutes * 60 * 1000;
    return Date.now() - last >= windowMs;
  }

  recordSent(conversationId: string, recipientUserId: string): void {
    this.lastSentAt.set(this.key(conversationId, recipientUserId), Date.now());
  }

  resetForTests(): void {
    this.lastSentAt.clear();
  }

  private key(conversationId: string, recipientUserId: string): string {
    return `${conversationId}:${recipientUserId}`;
  }
}
