import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { NotificationPreferencesResponseDto } from '../me-profile/dto/notification-preferences-response.dto';
import type { PatchNotificationPreferencesDto } from '../me-profile/dto/patch-notification-preferences.dto';
import { PrismaService } from '../prisma/prisma.service';
import type { GoogleIdentity } from './google-identity.types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const trimmed = id.trim();
    if (!trimmed) {
      return null;
    }
    return this.prisma.user.findUnique({ where: { id: trimmed } });
  }

  async findByEmail(email: string): Promise<User | null> {
    const e = email.trim();
    if (!e) {
      return null;
    }
    return this.prisma.user.findUnique({ where: { email: e } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const g = googleId.trim();
    if (!g) {
      return null;
    }
    return this.prisma.user.findUnique({ where: { googleId: g } });
  }

  /** First-time Google login: creates the `User` row (no product `UserProfile` row yet). */
  async createFromGoogleIdentity(
    identity: GoogleIdentity,
    options?: { referredByUserId?: string | null },
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: identity.email.trim(),
        googleId: identity.googleId.trim(),
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        lastLoginAt: new Date(),
        referredByUserId: options?.referredByUserId ?? null,
      },
    });
  }

  /**
   * Subsequent Google logins: refresh email/display/avatar from Google and bump `lastLoginAt`.
   * Caller must ensure `userId` is the row already keyed by this Google account.
   */
  async updateLoginFields(
    userId: string,
    identity: GoogleIdentity,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId.trim() },
      data: {
        email: identity.email.trim(),
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        lastLoginAt: new Date(),
      },
    });
  }

  async updateNotificationPreferences(
    userId: string,
    patch: PatchNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    const trimmed = userId.trim();
    if (!trimmed) {
      throw new Error('userId is required');
    }

    const data: {
      emailNotificationsEnabled?: boolean;
      inAppNotificationsEnabled?: boolean;
    } = {};
    if (patch.emailNotificationsEnabled !== undefined) {
      data.emailNotificationsEnabled = patch.emailNotificationsEnabled;
    }
    if (patch.inAppNotificationsEnabled !== undefined) {
      data.inAppNotificationsEnabled = patch.inAppNotificationsEnabled;
    }

    return this.prisma.user.update({
      where: { id: trimmed },
      data,
      select: {
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      },
    });
  }
}
