import type { MatchActionType, Prisma } from '@prisma/client';
import type { MatchListCursorPayload } from '../../cache/match-list-cache';
import type {
  AboutTextRow,
  CandidatePhotoAccessRow,
  EvaluationRow,
  LatestEvaluationForMatchRow,
  MatchActionRow,
  MutualMatchDetectResult,
  MutualMatchRow,
  RankPageRow,
  RankPersistRow,
  ViewerMatchContext,
  ViewerWithPreference,
} from './match.repository.types';

export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');

export interface IMatchRepository {
  findViewerMatchContextByUserId(
    userId: string,
  ): Promise<ViewerMatchContext | null>;
  findViewerWithPreferenceByUserId(
    userId: string,
  ): Promise<ViewerWithPreference | null>;
  findCandidateProfileForDetail<T extends Prisma.UserProfileSelect>(
    candidateProfileId: string,
    select: T,
  ): Promise<Prisma.UserProfileGetPayload<{ select: T }> | null>;
  findCandidateProfilesByIdsForList<T extends Prisma.UserProfileSelect>(
    ids: string[],
    select: T,
  ): Promise<Array<Prisma.UserProfileGetPayload<{ select: T }>>>;
  countCandidates(where: Prisma.UserProfileWhereInput): Promise<number>;
  listCandidates<T extends Prisma.UserProfileSelect>(args: {
    where: Prisma.UserProfileWhereInput;
    orderBy:
      | Prisma.UserProfileOrderByWithRelationInput
      | Prisma.UserProfileOrderByWithRelationInput[];
    take: number;
    select: T;
  }): Promise<Array<Prisma.UserProfileGetPayload<{ select: T }>>>;
  findCandidateProfileForPhotoAccess(
    candidateProfileId: string,
  ): Promise<CandidatePhotoAccessRow | null>;
  findAboutTextByProfileIds(ids: string[]): Promise<AboutTextRow[]>;

  countApprovedPhotosForProfile(profileId: string): Promise<number>;
  findApprovedPrimaryPhoto(
    profileId: string,
    photoId: string,
  ): Promise<{ mimeType: string; storageKey: string } | null>;
  findLatestEvaluationForProfile(
    profileId: string,
  ): Promise<EvaluationRow | null>;
  findLatestEvaluationsForProfileIds(
    profileIds: string[],
  ): Promise<Map<string, LatestEvaluationForMatchRow>>;

  findActionByActorTarget(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ action: MatchActionType } | null>;
  findActionWithCreatedAt(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ action: MatchActionType; createdAt: Date } | null>;
  listActionsByActor(
    actorUserId: string,
  ): Promise<Array<{ targetUserId: string; action: MatchActionType }>>;
  listActionsByActorForTargets(
    actorUserId: string,
    targetUserIds: string[],
  ): Promise<Array<{ targetUserId: string; action: MatchActionType }>>;
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
  listActiveMutualCounterpartUserIds(userId: string): Promise<string[]>;
  findActiveMutualByUserPair(
    userIdA: string,
    userIdB: string,
  ): Promise<MutualMatchRow | null>;

  deleteAllRanksForViewer(viewerUserId: string): Promise<number>;
  replaceRankSnapshot(
    viewerUserId: string,
    rows: RankPersistRow[],
    builtAt: Date,
  ): Promise<{ rowsWritten: number; rowsDeleted: number }>;
  fetchMatchListRankPage(
    viewerUserId: string,
    cursor: MatchListCursorPayload | null,
    take: number,
  ): Promise<RankPageRow[]>;
  countRanksForViewer(viewerUserId: string): Promise<number>;
}
