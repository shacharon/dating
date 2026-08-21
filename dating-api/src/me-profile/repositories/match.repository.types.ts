import type {
  MatchAction,
  MutualMatch,
  Prisma,
  UserProfileEvaluation,
} from '@prisma/client';

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
  created: boolean;
};

export type RankPersistRow = {
  candidateProfileId: string;
  matchScore: number;
  hardBlocked: boolean;
};

export type RankPageRow = RankPersistRow;
