import type { Prisma } from '@prisma/client';
import type {
  ContentViolationAction,
  ContentViolationSurface,
} from '../content-moderation.types';

export type CreateViolationInput = {
  userId: string;
  surface: ContentViolationSurface;
  flaggedText: string;
  category: string;
  score: number | null;
  action: ContentViolationAction;
  conversationId: string | null;
  recipientUserId: string | null;
};

export type UserViolationFields = {
  contentViolationStatus: string | null;
  contentViolationMutedUntil: Date | null;
  contentViolationCount: number;
};

export type ViolationStatsRaw = {
  byCategory: Array<{ category: string; count: number }>;
  bySurface: Array<{ surface: string; count: number }>;
  totalViolations: number;
  blockedProfileUsers: number;
  mutedUsers: Array<{ contentViolationMutedUntil: Date | null }>;
};

export type AdminViolationListArgs = {
  surface?: string;
  category?: string;
  userId?: string;
  action?: string;
  userStatus?: string;
  hasRecipient?: boolean;
  limit: number;
  offset: number;
};

export type AdminViolationRow = Prisma.UserContentViolationGetPayload<{
  include: {
    user: {
      select: {
        email: true;
        contentViolationStatus: true;
        contentViolationMutedUntil: true;
        profile: { select: { nickname: true } };
      };
    };
    recipient: {
      select: {
        email: true;
        profile: { select: { nickname: true } };
      };
    };
  };
}>;

export type AdminBlockedUserRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    contentViolationStatus: true;
    contentViolationMutedUntil: true;
    contentViolationCount: true;
    profile: { select: { nickname: true } };
    contentViolations: {
      select: {
        id: true;
        surface: true;
        category: true;
        flaggedText: true;
        score: true;
        action: true;
        createdAt: true;
        conversationId: true;
        recipientUserId: true;
        recipient: {
          select: {
            email: true;
            profile: { select: { nickname: true } };
          };
        };
      };
    };
  };
}>;
