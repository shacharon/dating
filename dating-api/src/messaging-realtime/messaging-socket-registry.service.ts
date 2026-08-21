import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { RedisCacheService } from '../cache/redis-cache.service';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { MessagingSocketData } from './messaging-ws-auth.service';
import {
  PRESENCE_TTL_SECONDS,
  decodePresenceMeta,
  encodePresenceMeta,
  presenceMetaKey,
  presenceSessionKey,
  presenceUserKey,
} from './messaging-presence.keys';

/**
 * Hybrid local socket index + Redis presence write-through (Sprint 49 Story 1).
 * - Local Maps: Socket handles for disconnect(true) on this node.
 * - Redis SETs: cross-process hasActiveConnection / logout clear.
 * - REDIS_URL unset → local Maps only.
 * - Redis configured but down → hasActiveConnection fail-open (false → send email).
 */
@Injectable()
export class MessagingSocketRegistry {
  private readonly logger = new Logger(MessagingSocketRegistry.name);
  private readonly bySession = new Map<string, Set<Socket>>();
  private readonly byUserId = new Map<string, Set<Socket>>();

  constructor(
    @Optional() private readonly cache?: RedisCacheService,
    @Optional() private readonly obs?: StructuredObservabilityService,
  ) {}

  /** Sync local index only (tests / legacy). Prefer registerAsync in gateway. */
  register(client: Socket): void {
    this.registerLocal(client);
  }

  /** Sync local remove only. Prefer unregisterAsync in gateway. */
  unregister(client: Socket): void {
    this.unregisterLocal(client);
  }

  async registerAsync(client: Socket): Promise<void> {
    this.registerLocal(client);
    const ok = await this.writeRedisPresence(client);
    if (ok) {
      this.obs?.trace(
        `presence registered socketId=${client.id}`,
        ErrorCodes.PRESENCE_REGISTERED,
      );
    }
  }

  async unregisterAsync(client: Socket): Promise<void> {
    const data = client.data as MessagingSocketData | undefined;
    this.unregisterLocal(client);
    if (data?.sessionId && data.userId) {
      await this.clearRedisSocket(client.id, data.userId, data.sessionId);
    }
  }

  /**
   * Online check for email skip.
   * Redis up → SCARD(user). Redis unset → local Map. Redis error/down → false (fail-open).
   */
  async hasActiveConnection(userId: string): Promise<boolean> {
    if (!this.redisConfigured()) {
      return this.hasLocalConnection(userId);
    }
    if (!this.cache?.isAvailable()) {
      this.traceDegraded('unavailable');
      return false;
    }
    const n = await this.cache.sCard(presenceUserKey(userId));
    if (n == null) {
      this.traceDegraded('error');
      return false;
    }
    return n > 0;
  }

  async disconnectByUserId(userId: string): Promise<void> {
    const redisIds = this.cache?.isAvailable()
      ? await this.cache.sMembers(presenceUserKey(userId))
      : null;

    const local = this.byUserId.get(userId);
    if (local) {
      for (const socket of [...local]) {
        const data = socket.data as MessagingSocketData | undefined;
        if (data?.sessionId) {
          const sessionSet = this.bySession.get(data.sessionId);
          if (sessionSet) {
            sessionSet.delete(socket);
            if (sessionSet.size === 0) {
              this.bySession.delete(data.sessionId);
            }
          }
        }
        socket.disconnect(true);
      }
      this.byUserId.delete(userId);
    }

    if (redisIds && redisIds.length > 0) {
      for (const socketId of redisIds) {
        const meta = await this.cache!.getString(presenceMetaKey(socketId));
        const decoded = decodePresenceMeta(meta);
        const sessionId = decoded?.sessionId;
        if (sessionId) {
          await this.clearRedisSocket(socketId, userId, sessionId);
        } else {
          await this.cache!.sRem(presenceUserKey(userId), socketId);
          await this.cache!.del(presenceMetaKey(socketId));
        }
      }
    } else if (this.cache?.isAvailable()) {
      await this.cache.del(presenceUserKey(userId));
    }

    this.obs?.trace(
      `presence cleared userId=${userId}`,
      ErrorCodes.PRESENCE_CLEARED,
    );
  }

  async disconnectBySessionId(sessionId: string): Promise<void> {
    const redisIds = this.cache?.isAvailable()
      ? await this.cache.sMembers(presenceSessionKey(sessionId))
      : null;

    const local = this.bySession.get(sessionId);
    if (local) {
      for (const socket of [...local]) {
        const data = socket.data as MessagingSocketData | undefined;
        if (data?.userId) {
          this.removeFromUserMap(data.userId, socket);
        }
        socket.disconnect(true);
      }
      this.bySession.delete(sessionId);
    }

    if (redisIds && redisIds.length > 0) {
      for (const socketId of redisIds) {
        const meta = await this.cache!.getString(presenceMetaKey(socketId));
        const decoded = decodePresenceMeta(meta);
        const userId = decoded?.userId;
        if (userId) {
          await this.clearRedisSocket(socketId, userId, sessionId);
        } else {
          await this.cache!.sRem(presenceSessionKey(sessionId), socketId);
          await this.cache!.del(presenceMetaKey(socketId));
        }
      }
    } else if (this.cache?.isAvailable()) {
      await this.cache.del(presenceSessionKey(sessionId));
    }

    this.obs?.trace(
      `presence cleared session=${sessionId.slice(0, 8)}…`,
      ErrorCodes.PRESENCE_CLEARED,
    );
  }

  /** Refresh Redis TTLs on session revalidate (silent). */
  async refreshPresence(client: Socket): Promise<void> {
    if (!this.cache?.isAvailable()) return;
    await this.writeRedisPresence(client);
  }

  activeConnectionCount(): number {
    let total = 0;
    for (const set of this.bySession.values()) {
      total += set.size;
    }
    return total;
  }

  /** Test-only. */
  resetForTests(): void {
    this.bySession.clear();
    this.byUserId.clear();
  }

  private redisConfigured(): boolean {
    return Boolean(process.env.REDIS_URL?.trim());
  }

  private hasLocalConnection(userId: string): boolean {
    const set = this.byUserId.get(userId);
    return !!set && set.size > 0;
  }

  private registerLocal(client: Socket): void {
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.sessionId) {
      return;
    }

    let sessionSet = this.bySession.get(data.sessionId);
    if (!sessionSet) {
      sessionSet = new Set();
      this.bySession.set(data.sessionId, sessionSet);
    }
    sessionSet.add(client);

    if (data.userId) {
      let userSet = this.byUserId.get(data.userId);
      if (!userSet) {
        userSet = new Set();
        this.byUserId.set(data.userId, userSet);
      }
      userSet.add(client);
    }
  }

  private unregisterLocal(client: Socket): void {
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.sessionId) {
      return;
    }

    const sessionSet = this.bySession.get(data.sessionId);
    if (sessionSet) {
      sessionSet.delete(client);
      if (sessionSet.size === 0) {
        this.bySession.delete(data.sessionId);
      }
    }

    if (data.userId) {
      this.removeFromUserMap(data.userId, client);
    }
  }

  private async writeRedisPresence(client: Socket): Promise<boolean> {
    if (!this.redisConfigured()) return false;
    if (!this.cache?.isAvailable()) {
      this.traceDegraded('unavailable');
      return false;
    }
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.sessionId || !data.userId) return false;

    const socketId = client.id;
    const userKey = presenceUserKey(data.userId);
    const sessionKey = presenceSessionKey(data.sessionId);
    const metaKey = presenceMetaKey(socketId);
    const ttl = PRESENCE_TTL_SECONDS;

    const a = await this.cache.sAdd(userKey, socketId, ttl);
    const b = await this.cache.sAdd(sessionKey, socketId, ttl);
    await this.cache.setString(
      metaKey,
      encodePresenceMeta(data.userId, data.sessionId),
      ttl,
    );
    if (!a || !b) {
      this.traceDegraded('error');
      return false;
    }
    return true;
  }

  private async clearRedisSocket(
    socketId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    if (!this.cache?.isAvailable()) return;
    const userKey = presenceUserKey(userId);
    const sessionKey = presenceSessionKey(sessionId);
    await this.cache.sRem(userKey, socketId);
    await this.cache.sRem(sessionKey, socketId);
    await this.cache.del(presenceMetaKey(socketId));
    const userCount = await this.cache.sCard(userKey);
    if (userCount === 0) {
      await this.cache.del(userKey);
    }
    const sessionCount = await this.cache.sCard(sessionKey);
    if (sessionCount === 0) {
      await this.cache.del(sessionKey);
    }
  }

  private traceDegraded(reason: string): void {
    this.obs?.trace(
      `presence redis degraded reason=${reason}`,
      ErrorCodes.PRESENCE_REDIS_DEGRADED,
    );
    this.logger.warn(`presence redis degraded reason=${reason}`);
  }

  private removeFromUserMap(userId: string, client: Socket): void {
    const userSet = this.byUserId.get(userId);
    if (!userSet) {
      return;
    }
    userSet.delete(client);
    if (userSet.size === 0) {
      this.byUserId.delete(userId);
    }
  }
}
