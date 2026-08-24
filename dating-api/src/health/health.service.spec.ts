import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  resetMessagingRedisAdapterBoundForTests,
  setMessagingRedisAdapterBound,
} from '../messaging-realtime/messaging-realtime-redis-state';

describe('HealthService', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let prisma: { $queryRaw: jest.Mock };
  let service: HealthService;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    service = new HealthService(prisma as unknown as PrismaService);
    resetMessagingRedisAdapterBoundForTests();
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    resetMessagingRedisAdapterBoundForTests();
  });

  it('returns ok when database ping succeeds (non-production, redis unbound)', async () => {
    process.env.NODE_ENV = 'development';

    const result = await service.getReadiness();

    expect(result.ok).toBe(true);
    expect(result.checks).toEqual({ database: 'ok', redisAdapter: 'ok' });
    expect(result.service).toBe('dating-api');
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('returns failed database check when prisma ping throws', async () => {
    process.env.NODE_ENV = 'development';
    prisma.$queryRaw.mockRejectedValue(new Error('db down'));

    const result = await service.getReadiness();

    expect(result.ok).toBe(false);
    expect(result.checks.database).toBe('failed');
    expect(result.checks.redisAdapter).toBe('ok');
  });

  it('requires redis adapter bound in production', async () => {
    process.env.NODE_ENV = 'production';
    resetMessagingRedisAdapterBoundForTests();

    const result = await service.getReadiness();

    expect(result.ok).toBe(false);
    expect(result.checks.database).toBe('ok');
    expect(result.checks.redisAdapter).toBe('failed');
  });

  it('returns ok in production when redis adapter is bound', async () => {
    process.env.NODE_ENV = 'production';
    setMessagingRedisAdapterBound(true);

    const result = await service.getReadiness();

    expect(result.ok).toBe(true);
    expect(result.checks).toEqual({ database: 'ok', redisAdapter: 'ok' });
  });
});
