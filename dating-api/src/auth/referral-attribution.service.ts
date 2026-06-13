import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReferralAttributionService {
  constructor(private readonly users: UsersService) {}

  /**
   * Validates a referrer id for new-user signup. Returns null when invalid — never throws.
   */
  async resolveReferrerUserId(
    rawReferrerId: string | undefined,
    newUserId: string,
  ): Promise<string | null> {
    const trimmed = rawReferrerId?.trim() ?? '';
    if (!trimmed) {
      return null;
    }
    if (newUserId && trimmed === newUserId) {
      return null;
    }

    const referrer = await this.users.findById(trimmed);
    if (!referrer) {
      return null;
    }
    if (referrer.deletedAt != null) {
      return null;
    }
    if (referrer.status !== UserStatus.ACTIVE) {
      return null;
    }

    return referrer.id;
  }
}
