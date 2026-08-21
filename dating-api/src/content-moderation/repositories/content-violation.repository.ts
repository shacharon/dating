import type {
  AdminBlockedUserRow,
  AdminViolationListArgs,
  AdminViolationRow,
  CreateViolationInput,
  UserViolationFields,
  ViolationStatsRaw,
} from './content-violation.repository.types';

export const CONTENT_VIOLATION_REPOSITORY = Symbol(
  'CONTENT_VIOLATION_REPOSITORY',
);

export interface IContentViolationRepository {
  createViolationAndIncrementCount(data: CreateViolationInput): Promise<void>;
  countViolations(filter: {
    userId: string;
    surface?: string;
    surfacePrefix?: string;
    since?: Date;
  }): Promise<number>;
  getUserViolationFields(userId: string): Promise<UserViolationFields | null>;
  setProfileEditBlocked(userId: string): Promise<void>;
  setMessagingMute(userId: string, mutedUntil: Date | null): Promise<void>;
  resetViolationStatus(userId: string): Promise<void>;
  clearExpiredMutes(now: Date): Promise<number>;
  getViolationStatsRaw(): Promise<ViolationStatsRaw>;
  findViolationsForAdmin(
    args: AdminViolationListArgs,
  ): Promise<{ rows: AdminViolationRow[]; total: number }>;
  findBlockedUsersForAdmin(args: {
    limit: number;
    offset: number;
  }): Promise<{ rows: AdminBlockedUserRow[]; total: number }>;
}
