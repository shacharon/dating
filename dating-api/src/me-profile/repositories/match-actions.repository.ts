import type { MatchActionType } from '@prisma/client';
import type {
  MatchActionRow,
  MutualMatchDetectResult,
  MutualMatchRow,
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
  }): Promise<{
    row: MatchActionRow;
    detectResult: MutualMatchDetectResult | null;
  }>;
  deleteActionByActorTarget(
    actorUserId: string,
    targetUserId: string,
  ): Promise<void>;
  detectAndCreateMutualMatch(
    actorUserId: string,
    targetUserId: string,
  ): Promise<MutualMatchDetectResult | null>;
  findActiveMutualByUserPair(
    userIdA: string,
    userIdB: string,
  ): Promise<MutualMatchRow | null>;
}
