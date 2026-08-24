import { ErrorCodes } from '../../logging/error-codes';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { resolveMatchPrimaryPhotoUrl } from '../../photo-storage/cdn-url';
import { buildMeMatchesParticipantReadModel } from '../me-profile-engine.mapper';
import {
  MatchListCandidateEvaluationMissingError,
  MatchListViewerEvaluationMissingError,
} from '../me-matches.errors';
import {
  rebaseMeMatchListItemScore,
  toMeMatchListItem,
} from '../me-matches-response.mapper';
import type { MeMatchItemDto } from '../dto/me-matches-response.dto';
import { buildProductProfileMatchingBridge } from '../user-profile-matching-bridge.contract';
import type { IMatchQueryRepository } from '../repositories/match-query.repository';
import type { RankPageRow } from '../repositories/match.repository.types';
import {
  matchActionToYourAction,
  partnerGenderSourceForMeMatchesRow,
  pickApprovedPrimaryPhotoId,
} from './match-list.helpers';

export type MatchListPageHydrateGate = {
  viewerProfileId: string;
  viewerDatingChapter: string | null;
  viewerAgeYears: number | null;
};

export type MatchListPageHydrateDeps = {
  matches: Pick<
    IMatchQueryRepository,
    | 'findViewerMatchContextByUserId'
    | 'findCandidateProfilesByIdsForList'
    | 'findLatestEvaluationsForProfileIds'
    | 'findLatestEvaluationForProfile'
    | 'listActionsByActorForTargets'
  >;
  obs: StructuredObservabilityService;
};

export type MatchListPageHydrateResult =
  | { cacheMiss: true }
  | { cacheMiss: false; matches: MeMatchItemDto[] };

export async function hydrateMatchListPageFromRanks(
  deps: MatchListPageHydrateDeps,
  userId: string,
  pageRanks: RankPageRow[],
  gate: MatchListPageHydrateGate,
): Promise<MatchListPageHydrateResult> {
  if (pageRanks.length === 0) {
    return { cacheMiss: false, matches: [] };
  }

  for (const row of pageRanks) {
    if (row.presentationJson == null) {
      return { cacheMiss: true };
    }
  }

  const pageIds = pageRanks.map((row) => row.candidateProfileId);
  const viewer = await deps.matches.findViewerMatchContextByUserId(userId);
  if (!viewer) {
    return { cacheMiss: true };
  }

  const viewerEval = await deps.matches.findLatestEvaluationForProfile(
    viewer.id,
  );
  if (!viewerEval) {
    throw new MatchListViewerEvaluationMissingError();
  }

  const asOf = new Date();
  const viewerBridge = buildProductProfileMatchingBridge(
    viewer,
    asOf,
    partnerGenderSourceForMeMatchesRow(viewer, deps.obs),
  );
  const {
    preference: viewerPreference,
    signals: viewerSignals = [],
    interests: viewerInterests = [],
    ...viewerProfileCore
  } = viewer;
  const viewerRead = buildMeMatchesParticipantReadModel(
    viewerProfileCore,
    viewerPreference ?? null,
    viewerEval,
    {
      signals: viewerSignals,
      interests: viewerInterests,
    },
  );
  if (viewerRead.hg.fallback) {
    deps.obs.trace(
      `event=hg_preference_fallback_used profileId=${viewer.id} reason=${viewerRead.hg.fallback.reason}`,
      ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
    );
  }

  const loaded =
    await deps.matches.findCandidateProfilesByIdsForList(pageIds);
  const candidateById = new Map(loaded.map((row) => [row.id, row]));
  const latestEvalByProfile =
    await deps.matches.findLatestEvaluationsForProfileIds(pageIds);
  const actionByTargetUserId = new Map(
    (
      await deps.matches.listActionsByActorForTargets(
        userId,
        loaded.map((row) => row.userId as string),
      )
    ).map((row) => [row.targetUserId, row.action]),
  );

  const viewerTeaserCtx = {
    datingChapter: gate.viewerDatingChapter,
    ageYears: gate.viewerAgeYears,
  };
  const matches: MeMatchItemDto[] = [];

  for (const rank of pageRanks) {
    const presentation = rank.presentationJson!;
    const row = candidateById.get(rank.candidateProfileId);
    if (!row) {
      continue;
    }

    const candidateEval = latestEvalByProfile.get(row.id);
    if (!candidateEval) {
      throw new MatchListCandidateEvaluationMissingError(row.id);
    }

    const {
      preference: candidatePreference,
      signals: candidateSignals = [],
      interests: candidateInterests = [],
      ...candidateProfileCore
    } = row;
    const candidateBridge = buildProductProfileMatchingBridge(
      {
        ...row,
        aboutMe: null,
        aboutPartner: null,
        aboutRelationship: null,
      },
      asOf,
      partnerGenderSourceForMeMatchesRow(row, deps.obs),
    );
    const candidateRead = buildMeMatchesParticipantReadModel(
      {
        ...candidateProfileCore,
        aboutMe: null,
        aboutPartner: null,
        aboutRelationship: null,
      },
      candidatePreference ?? null,
      candidateEval,
      {
        signals: candidateSignals,
        interests: candidateInterests,
      },
    );
    if (candidateRead.hg.fallback) {
      deps.obs.trace(
        `event=hg_preference_fallback_used profileId=${row.id} reason=${candidateRead.hg.fallback.reason}`,
        ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
      );
    }

    const approvedPhotos = row.photos ?? [];
    const primaryPhotoId = pickApprovedPrimaryPhotoId(approvedPhotos);
    const primaryStorageKey =
      approvedPhotos.find((p) => p.id === primaryPhotoId)?.storageKey ?? null;
    const cachedMatchScore =
      Number.isFinite(rank.matchScore) && rank.matchScore >= 0
        ? rank.matchScore
        : null;

    const item = toMeMatchListItem({
      id: row.id,
      nickname: row.nickname ?? null,
      gender: candidateBridge.selfGender,
      ageYears: candidateBridge.derivedSelfAgeYears,
      locationLabel: candidateBridge.location.locationLabel,
      analyzedAt: row.analyzedAt ?? null,
      hasEvaluation: row._count.evaluations > 0,
      profileAnalysisStale: row.updatedAt > candidateEval.createdAt,
      primaryPhotoUrl: resolveMatchPrimaryPhotoUrl({
        profileId: row.id,
        photoId: primaryPhotoId,
        storageKey: primaryStorageKey,
      }),
      approvedPhotoCount: approvedPhotos.length,
      yourAction: matchActionToYourAction(
        actionByTargetUserId.get(row.userId) ?? null,
      ),
      ...(rank.hardBlocked && presentation.hardBlockedDetail
        ? { hardBlocked: presentation.hardBlockedDetail }
        : {}),
      score: {
        matchScore: cachedMatchScore,
        explainability: presentation.explainability,
        recommendation: presentation.recommendation,
      },
      teaser: {
        datingChapter: viewer.datingChapter,
        viewerAgeYears: viewerBridge.derivedSelfAgeYears,
        viewerPayload: viewerRead.enginePayload,
        candidatePayload: candidateRead.enginePayload,
      },
    });

    matches.push(
      rebaseMeMatchListItemScore(item, cachedMatchScore, viewerTeaserCtx),
    );
  }

  return { cacheMiss: false, matches };
}
