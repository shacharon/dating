import type {
  MatchAction,
  MutualMatch,
  Prisma,
  UserProfileEvaluation,
} from '@prisma/client';
import type { AcceptedPartnerGender } from '../../canonical/matching-canonical.types';
import type {
  CANDIDATE_SELECT_DETAIL,
  CANDIDATE_SELECT_LIST,
} from './match-candidate.selects';

export type ViewerMatchContext = Prisma.UserProfileGetPayload<{
  include: {
    preference: true;
    signals: {
      select: { signalKey: true; signalValue: true; evalVersion: true };
    };
    interests: {
      select: { tag: true; rank: true; evalVersion: true };
    };
  };
}>;

export type ViewerWithPreference = Prisma.UserProfileGetPayload<{
  include: { preference: true };
}>;

/** Slim list/page hydrate row (see CANDIDATE_SELECT_LIST). */
export type MatchCandidateListRow = Prisma.UserProfileGetPayload<{
  select: typeof CANDIDATE_SELECT_LIST;
}>;

/** Detail / visibility row (see CANDIDATE_SELECT_DETAIL). */
export type MatchCandidateDetailRow = Prisma.UserProfileGetPayload<{
  select: typeof CANDIDATE_SELECT_DETAIL;
}>;

/** Domain filter for photo-eligible candidate count/list (no Prisma where). */
export type MatchListCandidateFilter = {
  viewerUserId: string;
  acceptedPartnerGenders: readonly AcceptedPartnerGender[] | null;
  preference: {
    partnerAgeMin: number | null;
    partnerAgeMax: number | null;
    maxDistanceKm: number | null;
    acceptedPartnerGenders: readonly string[];
  } | null;
  asOf: Date;
};

export type CandidatePhotoAccessRow = Prisma.UserProfileGetPayload<{
  select: {
    id: true;
    userId: true;
    status: true;
    birthDate: true;
    gender: true;
    desiredPartnerGenders: true;
    city: true;
    country: true;
    locationLabel: true;
    aboutMe: true;
    aboutPartner: true;
    aboutRelationship: true;
    preference: true;
    user: { select: { deletedAt: true } };
  };
}>;

export type AboutTextRow = {
  id: string;
  aboutMe: string | null;
  aboutPartner: string | null;
  aboutRelationship: string | null;
};

export type EvaluationRow = UserProfileEvaluation;

export type LatestEvaluationForMatchRow = {
  profileId: string;
  evaluationJson: Prisma.JsonValue;
  createdAt: Date;
  version: string;
};

export type MatchActionRow = MatchAction;

export type MutualMatchRow = MutualMatch;

export type MutualMatchDetectResult = {
  mutualMatch: MutualMatch;
  /** true = newly created OR reactivated from UNMATCHED (notify email/push) */
  created: boolean;
};

export type UpsertActionDetectResult = {
  row: MatchActionRow;
  detectResult: MutualMatchDetectResult | null;
  /** true iff an ACTIVE MutualMatch was transitioned to UNMATCHED in this call */
  unmatchedExisting: boolean;
};

export type RankPersistRow = {
  candidateProfileId: string;
  matchScore: number;
  hardBlocked: boolean;
};

export type RankPageRow = RankPersistRow;
