import { Inject, Injectable } from '@nestjs/common';
import { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import { PHOTO_STORAGE } from '../../../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../../../photo-storage/photo-storage.types';
import { buildProductProfileMatchingBridge } from '../../contracts/user-profile-matching-bridge.contract';
import {
  candidateHasApprovedPhoto,
  viewerHasApprovedPhoto,
} from '../../profile/me-profile-photo-gate';
import {
  MATCH_QUERY_REPOSITORY,
  type IMatchQueryRepository,
} from '../../repositories/match.repository';
import { MutualMatchesService } from '../actions/mutual-matches.service';
import {
  STATUS_ANALYZED,
  partnerGenderSourceForMeMatchesRow,
} from '../list/match-list.helpers';
import {
  MatchCandidateNotFoundError,
  MatchPhotoFileNotFoundError,
  MatchPhotoNotFoundError,
} from '../support/me-matches.errors';
import { MatchEligibilityService } from './match-eligibility.service';

@Injectable()
export class MatchDetailPhotoService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY) private readonly matches: IMatchQueryRepository,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
    private readonly mutualMatches: MutualMatchesService,
    private readonly eligibility: MatchEligibilityService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async getPrimaryPhotoFileById(
    userId: string,
    candidateProfileId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    const candidate =
      await this.matches.findCandidateProfileForPhotoAccess(candidateProfileId);
    if (!candidate || candidate.user?.deletedAt != null) {
      throw new MatchCandidateNotFoundError();
    }

    const mutual = await this.mutualMatches.findActiveByUserPair(
      userId,
      candidate.userId,
    );
    if (mutual) {
      return this.readApprovedPrimaryPhotoFile(candidateProfileId, photoId);
    }

    const viewer = await this.matches.findViewerWithPreferenceByUserId(userId);
    if (!viewer || viewer.status !== STATUS_ANALYZED) {
      throw new MatchCandidateNotFoundError();
    }

    if (!(await viewerHasApprovedPhoto(this.matches, viewer.id))) {
      throw new MatchCandidateNotFoundError();
    }

    if (candidate.status !== STATUS_ANALYZED) {
      throw new MatchCandidateNotFoundError();
    }

    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      new Date(),
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );
    const candidateBridge = buildProductProfileMatchingBridge(
      candidate,
      new Date(),
      partnerGenderSourceForMeMatchesRow(candidate, this.obs),
    );
    const eligible = this.eligibility.passesReciprocalGender(
      viewerBridge.acceptedPartnerGenders,
      viewerBridge.selfGender,
      candidateBridge.acceptedPartnerGenders,
      candidateBridge.selfGender,
    );
    if (!eligible) {
      throw new MatchCandidateNotFoundError();
    }

    if (!(await candidateHasApprovedPhoto(this.matches, candidate.id))) {
      throw new MatchCandidateNotFoundError();
    }

    await this.eligibility.assertViewerHasNotBlockedTarget(userId, candidate.userId);

    return this.readApprovedPrimaryPhotoFile(candidateProfileId, photoId);
  }

  async readApprovedPrimaryPhotoFile(
    candidateProfileId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    const photo = await this.matches.findApprovedPrimaryPhoto(
      candidateProfileId,
      photoId,
    );
    if (!photo) {
      throw new MatchPhotoNotFoundError();
    }
    const content = await this.photoStorage.read(photo.storageKey);
    if (!content) {
      throw new MatchPhotoFileNotFoundError();
    }
    return { contentType: photo.mimeType, content };
  }
}
