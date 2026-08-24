import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Socket } from 'socket.io';
import {
  CACHE_SETS,
  REDIS_CLIENT,
  type CacheSetsPort,
  type RedisClientHandle,
} from '../cache/cache.ports';
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
import type { RealtimePublisher } from './realtime-publisher.service';

/**
 * Hybrid local socket index + Redis presence write-through (Sprint 49 Story 1).
 * Story 3: force-disconnect via RealtimePublisher session/user rooms before local/Redis clear.
 */
@Injectable()
export class MessagingSocketRegistry {
  private readonly logger = new Logger(MessagingSocketRegistry.name);
  private readonly bySession = new Map<string, Set<Socket>>();
  private readonly byUserId = new Map<string, Set<Socket>>();

  constructor(
    @Optional() @Inject(CACHE_SETS) private readonly cache?: CacheSetsPort,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: RedisClientHandle,
    @Optional() private readonly obs?: StructuredObservabilityService,
    @Optional() private readonly publisher?: RealtimePublisher,
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
    if (data?.userId) {
      if (data.sessionId) {
        await this.clearRedisSocket(client.id, data.userId, data.sessionId);
      } else {
        await this.clearBearerRedisSocket(client.id, data.userId);
      }
    }
  }

  private cacheIfReady(): CacheSetsPort | null {
    if (!this.redis?.isAvailable() || !this.cache) return null;
    return this.cache;
  }

  /**
   * Online check for email skip.
   * Redis up → SCARD(user). Redis unset → local Map. Redis error/down → false (fail-open).
   */
  async hasActiveConnection(userId: string): Promise<boolean> {
    if (!this.redisConfigured()) {
      return this.hasLocalConnection(userId);
    }
    const cache = this.cacheIfReady();
    if (!cache) {
      this.traceDegraded('unavailable');
      return false;
    }
    const n = await cache.sCard(presenceUserKey(userId));
    if (n == null) {
      this.traceDegraded('error');
      return false;
    }
    return n > 0;
  }

  async disconnectByUserId(userId: string): Promise<void> {
    this.publisher?.disconnectUserSockets(userId);

    const cache = this.cacheIfReady();
    const redisIds = cache
      ? await cache.sMembers(presenceUserKey(userId))
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

    if (redisIds && redisIds.length > 0 && cache) {
      for (const socketId of redisIds) {
        const meta = await cache.getString(presenceMetaKey(socketId));
        const decoded = decodePresenceMeta(meta);
        const sessionId = decoded?.sessionId;
        if (sessionId) {
          await this.clearRedisSocket(socketId, userId, sessionId);
        } else {
          await cache.sRem(presenceUserKey(userId), socketId);
          await cache.del(presenceMetaKey(socketId));
        }
      }
    } else if (cache) {
      await cache.del(presenceUserKey(userId));
    }

    this.obs?.trace(
      `presence cleared userId=${userId}`,
      ErrorCodes.PRESENCE_CLEARED,
    );
  }

  async disconnectBySessionId(sessionId: string): Promise<void> {
    this.publisher?.disconnectSessionSockets(sessionId);

    const cache = this.cacheIfReady();
    const redisIds = cache
      ? await cache.sMembers(presenceSessionKey(sessionId))
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

    if (redisIds && redisIds.length > 0 && cache) {
      for (const socketId of redisIds) {
        const meta = await cache.getString(presenceMetaKey(socketId));
        const decoded = decodePresenceMeta(meta);
        const userId = decoded?.userId;
        if (userId) {
          await this.clearRedisSocket(socketId, userId, sessionId);
        } else {
          await cache.sRem(presenceSessionKey(sessionId), socketId);
          await cache.del(presenceMetaKey(socketId));
        }
      }
    } else if (cache) {
      await cache.del(presenceSessionKey(sessionId));
    }

    this.obs?.trace(
      `presence cleared session=${sessionId.slice(0, 8)}…`,
      ErrorCodes.PRESENCE_CLEARED,
    );
  }

  /** Refresh Redis TTLs on session revalidate (silent). */
  async refreshPresence(client: Socket): Promise<void> {
    if (!this.redis?.isAvailable()) return;
    await this.writeRedisPresence(client);
  }

  activeConnectionCount(): number {
    let total = 0;
    for (const set of this.byUserId.values()) {
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
    if (!data?.userId) {
      return;
    }

    if (data.authKind === 'bearer') {
      this.addToUserMap(data.userId, client);
      return;
    }

    if (!data.sessionId) {
      return;
    }

    let sessionSet = this.bySession.get(data.sessionId);
    if (!sessionSet) {
      sessionSet = new Set();
      this.bySession.set(data.sessionId, sessionSet);
    }
    sessionSet.add(client);
    this.addToUserMap(data.userId, client);
  }

  private unregisterLocal(client: Socket): void {
    const data = client.data as MessagingSocketData | undefined;
    if (!data) {
      return;
    }

    if (data.authKind === 'bearer') {
      if (data.userId) {
        this.removeFromUserMap(data.userId, client);
      }
      return;
    }

    if (!data.sessionId) {
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
    const cache = this.cacheIfReady();
    if (!cache) {
      this.traceDegraded('unavailable');
      return false;
    }
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.userId) return false;

    const socketId = client.id;
    const userKey = presenceUserKey(data.userId);
    const metaKey = presenceMetaKey(socketId);
    const ttl = PRESENCE_TTL_SECONDS;

    if (data.authKind === 'bearer' || !data.sessionId) {
      const ok = await cache.sAdd(userKey, socketId, ttl);
      await cache.setString(
        metaKey,
        encodePresenceMeta(data.userId),
        ttl,
      );
      if (!ok) {
        this.traceDegraded('error');
        return false;
      }
      return true;
    }

    const sessionKey = presenceSessionKey(data.sessionId);
    const a = await cache.sAdd(userKey, socketId, ttl);
    const b = await cache.sAdd(sessionKey, socketId, ttl);
    await cache.setString(
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

  private async clearBearerRedisSocket(
    socketId: string,
    userId: string,
  ): Promise<void> {
    const cache = this.cacheIfReady();
    if (!cache) return;
    const userKey = presenceUserKey(userId);
    await cache.sRem(userKey, socketId);
    await cache.del(presenceMetaKey(socketId));
    const userCount = await cache.sCard(userKey);
    if (userCount === 0) {
      await cache.del(userKey);
    }
  }

  private async clearRedisSocket(
    socketId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const cache = this.cacheIfReady();
    if (!cache) return;
    const userKey = presenceUserKey(userId);
    const sessionKey = presenceSessionKey(sessionId);
    await cache.sRem(userKey, socketId);
    await cache.sRem(sessionKey, socketId);
    await cache.del(presenceMetaKey(socketId));
    const userCount = await cache.sCard(userKey);
    if (userCount === 0) {
      await cache.del(userKey);
    }
    const sessionCount = await cache.sCard(sessionKey);
    if (sessionCount === 0) {
      await cache.del(sessionKey);
    }
  }

  private traceDegraded(reason: string): void {
    this.obs?.trace(
      `presence redis degraded reason=${reason}`,
      ErrorCodes.PRESENCE_REDIS_DEGRADED,
    );
    this.logger.warn(`presence redis degraded reason=${reason}`);
  }

  private addToUserMap(userId: string, client: Socket): void {
    let userSet = this.byUserId.get(userId);
    if (!userSet) {
      userSet = new Set();
      this.byUserId.set(userId, userSet);
    }
    userSet.add(client);
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
