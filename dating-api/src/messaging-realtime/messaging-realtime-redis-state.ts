/** Set at boot when `RedisIoAdapter` attaches a Redis adapter (`REDIS_URL` set). */
let redisAdapterBound = false;

export function setMessagingRedisAdapterBound(bound: boolean): void {
  redisAdapterBound = bound;
}

export function isMessagingRedisAdapterBound(): boolean {
  return redisAdapterBound;
}

/** @internal — unit tests only */
export function resetMessagingRedisAdapterBoundForTests(): void {
  redisAdapterBound = false;
}
