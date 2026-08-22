/** Shared JWT config stub for integration tests using {@link AuthModule}. */
export const JWT_TEST_SECRET = 'test-jwt-secret-min-32-characters-long';

export const jwtConfigStub = {
  jwtSecret: JWT_TEST_SECRET,
  accessTtl: '15m',
  refreshTtl: '7d',
  refreshTtlDays: 7,
  requireJwtSecret: (): string => JWT_TEST_SECRET,
};

export function createRefreshTokenPrismaStub() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'rt_test' }),
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
}
