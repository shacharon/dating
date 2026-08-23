import type { AnalyticsService } from '../../analytics/analytics.service';
import type { ContentViolationService } from '../../content-moderation/content-violation.service';
import type { ContentModerationPort } from '../../content-moderation/content-moderation.ports';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type { PhotoStorage } from '../../photo-storage/photo-storage.types';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MatchListRankQueuePort } from '../../workers/match-list-rank.ports';
import type { PhotoModerationQueueService } from '../../workers/photo-moderation.worker';
import type { ProfileAnalysisQueueService } from '../../workers/profile-analysis.worker';
import type { MeMatchesService } from '../matches/core/me-matches.service';
import { MeProfileService } from '../profile/me-profile.service';
import { ProfileAnalysisSubmitService } from '../profile/profile-analysis-submit.service';
import { ProfileCrudService } from '../profile/profile-crud.service';
import { ProfileModerationService } from '../profile/profile-moderation.service';
import { ProfilePhotoService } from '../profile/profile-photo.service';
import { ProfilePreferenceService } from '../profile/profile-preference.service';
import type { IProfilePhotoRepository } from '../repositories/profile-photo.repository';
import { PrismaProfilePhotoRepository } from '../repositories/prisma-profile-photo.repository';
import { PrismaUserProfileRepository } from '../repositories/prisma-user-profile.repository';
import { PrismaMatchRepository } from '../repositories/prisma-match.repository';
import type { IUserProfileRepository } from '../repositories/user-profile.repository';

/** Collaborator dependencies, in the same order as the pre-split `MeProfileService` constructor. */
export type MeProfileServiceTestDeps = {
  prisma: PrismaService;
  obs: StructuredObservabilityService;
  photoStorage: PhotoStorage;
  analytics: AnalyticsService;
  analysisQueue: ProfileAnalysisQueueService;
  photoModerationQueue: PhotoModerationQueueService;
  meMatches: MeMatchesService;
  moderation: ContentModerationPort;
  contentViolations: ContentViolationService;
  matchListRankQueue: MatchListRankQueuePort;
  /** Optional port double — when omitted, uses real PrismaUserProfileRepository over `prisma`. */
  userProfiles?: IUserProfileRepository;
  /** Optional photo port double — when omitted, uses the Prisma adapter. */
  profilePhotos?: IProfilePhotoRepository;
};

/**
 * Builds a `MeProfileService` facade backed by real collaborators, so unit specs can
 * drive the whole profile path from leaf mocks without a Nest testing module.
 */
export function createMeProfileServiceForTest(
  deps: MeProfileServiceTestDeps,
): MeProfileService {
  const moderation = new ProfileModerationService(
    deps.obs,
    deps.moderation,
    deps.contentViolations,
  );
  const preference = new ProfilePreferenceService();
  const profiles =
    deps.userProfiles ??
    new PrismaUserProfileRepository(deps.prisma, preference);
  const crud = new ProfileCrudService(
    profiles,
    deps.obs,
    moderation,
    deps.matchListRankQueue,
    deps.meMatches,
    deps.analytics,
  );
  const photos = new ProfilePhotoService(
    deps.profilePhotos ?? new PrismaProfilePhotoRepository(deps.prisma),
    deps.obs,
    deps.photoStorage,
    deps.analytics,
    deps.photoModerationQueue,
    crud,
  );
  const analysisSubmit = new ProfileAnalysisSubmitService(
    profiles,
    new PrismaMatchRepository(deps.prisma),
    deps.obs,
    deps.analytics,
    deps.analysisQueue,
    deps.meMatches,
  );
  return new MeProfileService(crud, photos, analysisSubmit);
}
