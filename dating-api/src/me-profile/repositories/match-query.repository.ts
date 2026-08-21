import type { MatchActionType } from '@prisma/client';
import type {
  AboutTextRow,
  CandidatePhotoAccessRow,
  EvaluationRow,
  LatestEvaluationForMatchRow,
  MatchCandidateDetailRow,
  MatchCandidateListRow,
  MatchListCandidateFilter,
  ViewerMatchContext,
  ViewerWithPreference,
} from './match.repository.types';

export const MATCH_QUERY_REPOSITORY = Symbol('MATCH_QUERY_REPOSITORY');

export interface IMatchQueryRepository {
  findViewerMatchContextByUserId(
    userId: string,
  ): Promise<ViewerMatchContext | null>;
  findViewerWithPreferenceByUserId(
    userId: string,
  ): Promise<ViewerWithPreference | null>;

  findCandidateProfileForDetail(
    candidateProfileId: string,
  ): Promise<MatchCandidateDetailRow | null>;
  findCandidateProfilesByIdsForList(
    ids: string[],
  ): Promise<MatchCandidateListRow[]>;
  countAnalyzedCandidatesExcludingUser(viewerUserId: string): Promise<number>;
  countPhotoEligibleCandidates(
    filter: MatchListCandidateFilter,
  ): Promise<number>;
  listPhotoEligibleCandidates(
    filter: MatchListCandidateFilter,
    take: number,
  ): Promise<MatchCandidateListRow[]>;

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
  listActionsByActor(
    actorUserId: string,
  ): Promise<Array<{ targetUserId: string; action: MatchActionType }>>;
  listActionsByActorForTargets(
    actorUserId: string,
    targetUserIds: string[],
  ): Promise<Array<{ targetUserId: string; action: MatchActionType }>>;
  listActiveMutualCounterpartUserIds(userId: string): Promise<string[]>;
}
