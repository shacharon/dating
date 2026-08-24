import type { MatchActionType } from '@prisma/client';
import type {
  MutualMatchDetectResult,
  MutualMatchRow,
  UpsertActionDetectResult,
} from './match.repository.types';

export const MATCH_ACTIONS_REPOSITORY = Symbol('MATCH_ACTIONS_REPOSITORY');

export interface IMatchActionsRepository {
  findActionByActorTarget(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ action: MatchActionType } | null>;
  findActionWithCreatedAt(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ action: MatchActionType; createdAt: Date } | null>;
  upsertActionAndDetectMutual(args: {
    actorUserId: string;
    targetUserId: string;
    targetProfileIdSnapshot: string;
    action: MatchActionType;
  }): Promise<UpsertActionDetectResult>;
  /**
   * Deletes the actor→target action. When `softUnmatchIfLike`, also soft-unmatches
   * an ACTIVE MutualMatch for the pair (Sprint 67 Story 2).
   */
  deleteActionByActorTarget(
    actorUserId: string,
    targetUserId: string,
    softUnmatchIfLike?: boolean,
  ): Promise<{ unmatchedExisting: boolean }>;
  detectAndCreateMutualMatch(
    actorUserId: string,
    targetUserId: string,
  ): Promise<MutualMatchDetectResult | null>;
  findActiveMutualByUserPair(
    userIdA: string,
    userIdB: string,
  ): Promise<MutualMatchRow | null>;
}
