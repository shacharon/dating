import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  CACHE_KV,
  REDIS_CLIENT,
  type CacheKvPort,
  type RedisClientHandle,
} from '../cache/cache.ports';
import { EmailNotificationConfigService } from './email-notification-config.service';
import {
  emailMsgDebounceKey,
  emailMsgDebounceTtlSeconds,
} from './email-debounce.keys';

/**
 * Cross-process new-message email debounce (Sprint 49 Story 2).
 * - REDIS_URL unset → in-memory Map (local/single-node).
 * - Redis up → SET NX EX claim.
 * - Redis configured but down → fail-open (allow send).
 */
@Injectable()
export class MessageEmailDebounceService {
  private readonly logger = new Logger(MessageEmailDebounceService.name);
  private readonly lastSentAt = new Map<string, number>();

  constructor(
    private readonly config: EmailNotificationConfigService,
    @Optional() @Inject(CACHE_KV) private readonly cache?: CacheKvPort,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: RedisClientHandle,
  ) {}

  /**
   * Atomically claim the right to send one new-message email for this pair.
   * true → caller may send; false → within debounce window (skip).
   */
  async tryClaimSend(
    conversationId: string,
    recipientUserId: string,
  ): Promise<boolean> {
    const mapKey = this.mapKey(conversationId, recipientUserId);
    const ttlSeconds = emailMsgDebounceTtlSeconds(
      this.config.messageDebounceMinutes,
    );
    const windowMs = ttlSeconds * 1000;

    if (!this.redisConfigured()) {
      return this.tryClaimLocal(mapKey, windowMs);
    }

    if (!this.redis?.isAvailable()) {
      this.logger.warn(
        'email debounce redis unavailable — fail-open allow send',
      );
      return true;
    }

    const redisKey = emailMsgDebounceKey(conversationId, recipientUserId);
    return this.cache!.setNx(
      redisKey,
      { at: new Date().toISOString() },
      ttlSeconds,
    );
  }

  /** Undo claim if send definitively did not happen (thrown before/during send). */
  async releaseClaim(
    conversationId: string,
    recipientUserId: string,
  ): Promise<void> {
    const mapKey = this.mapKey(conversationId, recipientUserId);

    if (!this.redisConfigured()) {
      this.lastSentAt.delete(mapKey);
      return;
    }

    if (!this.redis?.isAvailable() || !this.cache) {
      return;
    }

    await this.cache.del(
      emailMsgDebounceKey(conversationId, recipientUserId),
    );
  }

  /** Test-only. */
  resetForTests(): void {
    this.lastSentAt.clear();
  }

  private redisConfigured(): boolean {
    return Boolean(process.env.REDIS_URL?.trim());
  }

  private tryClaimLocal(mapKey: string, windowMs: number): boolean {
    const last = this.lastSentAt.get(mapKey);
    const now = Date.now();
    if (last != null && now - last < windowMs) {
      return false;
    }
    this.lastSentAt.set(mapKey, now);
    return true;
  }

  private mapKey(conversationId: string, recipientUserId: string): string {
    return `${conversationId}:${recipientUserId}`;
  }
}
