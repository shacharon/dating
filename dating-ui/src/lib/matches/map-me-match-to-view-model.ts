/**
 * Pure mappers: me-matches wire DTOs → product view-models.
 */

import type {
  HardBlockedDto,
  MatchExplainabilityDto,
  MatchRecommendationDto,
  MatchTeaserDto,
  MeMatchDetailDto,
  MeMatchItemDto,
  MeMatchesListDto,
} from '@/lib/me-matches-api';
import { resolveChipEvidenceCode } from '@/lib/matches/chip-evidence';
import type {
  GroupedPriorityMatchesVM,
  MatchDetailVM,
  MatchHardBlockVM,
  MatchListItemVM,
  MatchListNotReadyReason,
  MatchListPageVM,
  MatchPriorityTier,
  MatchRecommendationVM,
  MatchTeaserVM,
  MatchViewerAction,
  MatchWhyVM,
} from './match-view-models';

const PRIORITY_HIGH_MIN = 85;
const PRIORITY_GOOD_MIN = 70;

function finiteOrNull(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) ? n : null;
}

function resolveScore(
  matchScore: number | null | undefined,
  priorityScore?: number | null,
): number | null {
  const fromMatch = finiteOrNull(matchScore);
  if (fromMatch != null) return fromMatch;
  return finiteOrNull(priorityScore);
}

export function resolveMatchTier(input: {
  priorityTier?: string | null;
  score: number | null;
}): MatchPriorityTier {
  const tier = input.priorityTier;
  if (tier === 'HIGH' || tier === 'GOOD' || tier === 'OTHER') return tier;
  const score = input.score;
  if (score == null || !Number.isFinite(score)) return 'OTHER';
  if (score >= PRIORITY_HIGH_MIN) return 'HIGH';
  if (score >= PRIORITY_GOOD_MIN) return 'GOOD';
  return 'OTHER';
}

function mapWhy(dto: MatchExplainabilityDto | null): MatchWhyVM | null {
  if (!dto) return null;
  const tension = dto.tensionChip?.trim() || null;
  return {
    positiveChips: (dto.positiveChips ?? []).map(resolveChipEvidenceCode),
    tensionChip: tension,
    reasonShort: dto.reasonShort ?? '',
    sharedInterestNote: dto.sharedInterestNote ?? null,
    interestOverlapTags: dto.interestOverlapTags ?? [],
  };
}

function mapRecommendation(
  dto: MatchRecommendationDto | null,
): MatchRecommendationVM | null {
  if (!dto) return null;
  return {
    primaryTakeaway: dto.primaryTakeaway,
    caution: dto.caution ?? null,
    suggestedNextAction: dto.suggestedNextAction,
  };
}

function mapTeaser(dto: MatchTeaserDto | undefined | null): MatchTeaserVM | null {
  if (!dto) return null;
  return {
    mode: dto.mode,
    lines: dto.lines ?? [],
    claim: dto.claim ?? null,
    showScore: dto.showScore,
    score: finiteOrNull(dto.score),
    askHint: dto.askHint ?? null,
  };
}

function mapHardBlock(dto: HardBlockedDto | undefined): MatchHardBlockVM | null {
  if (!dto) return null;
  return {
    disabled: true,
    reasons: (dto.reasons ?? []).map((r) => ({
      code: r.code,
      dimension: r.dimension,
      direction: r.direction,
      message: r.message,
      viewerQuote: r.evidence?.viewerQuote ?? null,
      counterpartyQuote: r.evidence?.counterpartyQuote ?? null,
    })),
  };
}

function mapViewerAction(
  action: MeMatchItemDto['yourAction'],
): MatchViewerAction | null {
  if (action === 'LIKE' || action === 'PASS' || action === 'BLOCK') return action;
  return null;
}

function mapCardCore(
  dto: MeMatchItemDto | MeMatchDetailDto,
  score: number | null,
): Omit<MatchListItemVM, 'tier' | 'viewerAction'> {
  return {
    id: dto.id,
    nickname: dto.nickname,
    gender: dto.gender,
    ageYears: dto.ageYears,
    locationLabel: dto.locationLabel,
    analyzedAt: dto.analyzedAt,
    hasEvaluation: dto.hasEvaluation,
    score,
    profileAnalysisStale: Boolean(dto.profileAnalysisStale),
    primaryPhotoUrl: dto.primaryPhotoUrl ?? null,
    approvedPhotoCount: dto.approvedPhotoCount ?? 0,
    why: mapWhy(dto.explainability),
    recommendation: mapRecommendation(dto.recommendation),
    teaser: mapTeaser(dto.teaser),
    hardBlock: mapHardBlock(dto.hardBlocked),
  };
}

export function mapMeMatchItemToViewModel(dto: MeMatchItemDto): MatchListItemVM {
  const score = resolveScore(dto.matchScore, dto.priorityScore);
  return {
    ...mapCardCore(dto, score),
    tier: resolveMatchTier({ priorityTier: dto.priorityTier, score }),
    viewerAction: mapViewerAction(dto.yourAction),
  };
}

export function mapMeMatchDetailToViewModel(dto: MeMatchDetailDto): MatchDetailVM {
  const score = resolveScore(dto.matchScore);
  return {
    ...mapCardCore(dto, score),
    summary: dto.evaluationSummary,
    traits: (dto.matchExplanationTraits ?? []).map((t) => ({
      group: t.group,
      label: t.label,
      evidence: t.evidence,
      strength: t.strength,
    })),
    narrative: dto.matchNarrative ?? null,
  };
}

export function mapMeMatchesListToViewModel(
  dto: MeMatchesListDto,
): MatchListPageVM {
  if (dto.status === 'not_ready') {
    const reason = (dto.reason ?? 'no_profile') as MatchListNotReadyReason;
    return {
      status: 'not_ready',
      reason,
      nextCursor: null,
      hasMore: false,
    };
  }

  return {
    status: 'ready',
    viewerProfileId: dto.viewerProfileId ?? '',
    viewerGender: dto.viewerGender ?? null,
    viewerAcceptedPartnerGenders: dto.viewerAcceptedPartnerGenders ?? null,
    viewerProfileAnalysisStale: Boolean(dto.viewerProfileAnalysisStale),
    totalCandidatesBeforeFilter:
      dto.totalCandidatesBeforeFilter != null
        ? dto.totalCandidatesBeforeFilter
        : null,
    filteredNoPhotoCandidates:
      dto.filteredNoPhotoCandidates != null
        ? dto.filteredNoPhotoCandidates
        : null,
    budgetExceeded: dto.budgetExceeded != null ? dto.budgetExceeded : null,
    matches: (dto.matches ?? []).map(mapMeMatchItemToViewModel),
    nextCursor: dto.nextCursor ?? null,
    hasMore: Boolean(dto.hasMore),
  };
}

export function groupMatchesByPriorityVm(
  matches: MatchListItemVM[],
): GroupedPriorityMatchesVM {
  const high: MatchListItemVM[] = [];
  const good: MatchListItemVM[] = [];
  const other: MatchListItemVM[] = [];
  const blocked: MatchListItemVM[] = [];

  for (const m of matches) {
    if (m.hardBlock) {
      blocked.push(m);
      continue;
    }
    if (m.tier === 'HIGH') high.push(m);
    else if (m.tier === 'GOOD') good.push(m);
    else other.push(m);
  }

  return { high, good, other, blocked };
}
