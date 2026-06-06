import { UserStatus } from '@prisma/client';
import { toAuthMeResponseDto } from './auth.dto';

describe('toAuthMeResponseDto', () => {
  it('includes notification flags with defaults when omitted on user row', () => {
    const dto = toAuthMeResponseDto({
      id: 'u1',
      email: 'a@b.com',
      googleId: 'g1',
      displayName: 'A',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      emailNotificationsEnabled: undefined as unknown as boolean,
      inAppNotificationsEnabled: undefined as unknown as boolean,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(dto.emailNotificationsEnabled).toBe(true);
    expect(dto.inAppNotificationsEnabled).toBe(true);
  });

  it('passes through explicit notification flags', () => {
    const dto = toAuthMeResponseDto({
      id: 'u1',
      email: 'a@b.com',
      googleId: 'g1',
      displayName: 'A',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      emailNotificationsEnabled: false,
      inAppNotificationsEnabled: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(dto.emailNotificationsEnabled).toBe(false);
    expect(dto.inAppNotificationsEnabled).toBe(true);
  });
});
