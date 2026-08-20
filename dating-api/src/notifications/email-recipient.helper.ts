import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';

export type EmailRecipientRow = {
  id: string;
  email: string;
  emailNotificationsEnabled: boolean;
};

export type EmailUserLabelRow = {
  id: string;
  email: string;
  displayName: string | null;
  emailNotificationsEnabled: boolean;
  profile: { nickname: string | null } | null;
};

@Injectable()
export class EmailRecipientHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  loadRecipient(userId: string): Promise<EmailRecipientRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailNotificationsEnabled: true,
      },
    });
  }

  loadUserWithLabel(userId: string): Promise<EmailUserLabelRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailNotificationsEnabled: true,
        profile: { select: { nickname: true } },
      },
    });
  }

  /**
   * If !enabled → obs.trace with EMAIL_SKIPPED_UNSUBSCRIBED and return true (caller aborts).
   */
  shouldSkipUnsubscribed(params: {
    userId: string;
    enabled: boolean;
    emailKind: string;
  }): boolean {
    if (params.enabled) {
      return false;
    }
    this.obs.trace(
      `email ${params.emailKind} skipped unsubscribed userId=${params.userId}`,
      ErrorCodes.EMAIL_SKIPPED_UNSUBSCRIBED,
    );
    return true;
  }
}
