import { ForbiddenException } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { AdminConfigService } from './admin-config.service';
import { AdminGuard } from './admin.guard';

function mockContext(authUserId?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        authUser: authUserId ? { id: authUserId } : undefined,
      }),
    }),
  } as never;
}

describe('AdminGuard', () => {
  const adminConfig = {
    isAdmin: jest.fn(),
  } as unknown as AdminConfigService;
  const obs = {
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let guard: AdminGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AdminGuard(adminConfig, obs);
  });

  it('allows admin users', () => {
    (adminConfig.isAdmin as jest.Mock).mockReturnValue(true);
    expect(guard.canActivate(mockContext('admin_1'))).toBe(true);
    expect(obs.error).not.toHaveBeenCalled();
  });

  it('denies non-admin with admin_forbidden body and ADMIN_FORBIDDEN log', () => {
    (adminConfig.isAdmin as jest.Mock).mockReturnValue(false);
    expect(() => guard.canActivate(mockContext('user_1'))).toThrow(
      ForbiddenException,
    );
    try {
      guard.canActivate(mockContext('user_1'));
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      expect((e as ForbiddenException).getResponse()).toEqual({
        error: 'admin_forbidden',
      });
    }
    expect(obs.error).toHaveBeenCalledWith(
      'admin guard: forbidden',
      ErrorCodes.ADMIN_FORBIDDEN,
    );
  });

  it('denies missing authUser the same way', () => {
    expect(() => guard.canActivate(mockContext())).toThrow(ForbiddenException);
    expect(obs.error).toHaveBeenCalledWith(
      'admin guard: forbidden',
      ErrorCodes.ADMIN_FORBIDDEN,
    );
    expect(adminConfig.isAdmin).not.toHaveBeenCalled();
  });
});
