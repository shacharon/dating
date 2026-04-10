import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { filterCandidatesByHardEligibility } from './pairwise-hard-eligibility-filter';

/** Max points when ages match; decreases by 1 per year of gap (floored at 0). */
const SCORE_AGE_CLOSENESS_MAX = 60;

/** Points per shared interest tag (after normalization). */
const SCORE_PER_SHARED_INTEREST = 10;

/** Bonus when primary location labels match (trim + lowercase). */
const SCORE_SAME_LOCATION_LABEL = 25;

function ageWholeYearsUtc(dateOfBirthYmd: string, ref: Date): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirthYmd);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ty = ref.getUTCFullYear();
  const tm = ref.getUTCMonth();
  const td = ref.getUTCDate();
  let age = ty - y;
  if (tm < mo - 1 || (tm === mo - 1 && td < d)) age -= 1;
  return age;
}

function normalizedLocationLabel(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const t = raw.trim().toLowerCase();
  return t.length > 0 ? t : undefined;
}

function interestTagSet(tags: readonly string[] | undefined): Set<string> {
  const out = new Set<string>();
  if (!tags) return out;
  for (const raw of tags) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (t.length > 0) out.add(t);
  }
  return out;
}

function sharedInterestCount(
  a: readonly string[] | undefined,
  b: readonly string[] | undefined,
): number {
  const sa = interestTagSet(a);
  const sb = interestTagSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let n = 0;
  for (const x of sa) {
    if (sb.has(x)) n += 1;
  }
  return n;
}

function computeRankScoreAndReasons(
  searcher: MatchingCanonicalModel,
  candidate: MatchingCanonicalModel,
  evaluatedAt: Date,
): { rankScore: number; rankReasons: string[] } {
  let rankScore = 0;
  const rankReasons: string[] = [];

  const dobS = searcher.facts.dateOfBirth;
  const dobC = candidate.facts.dateOfBirth;
  const ageS = dobS !== undefined ? ageWholeYearsUtc(dobS, evaluatedAt) : undefined;
  const ageC = dobC !== undefined ? ageWholeYearsUtc(dobC, evaluatedAt) : undefined;
  if (ageS !== undefined && ageC !== undefined) {
    const gap = Math.abs(ageS - ageC);
    const pts = Math.max(0, SCORE_AGE_CLOSENESS_MAX - gap);
    if (pts > 0) {
      rankScore += pts;
      rankReasons.push(`age_closeness:+${pts}(gap_years=${gap})`);
    }
  }

  const shared = sharedInterestCount(searcher.facts.interestTags, candidate.facts.interestTags);
  if (shared > 0) {
    const pts = shared * SCORE_PER_SHARED_INTEREST;
    rankScore += pts;
    rankReasons.push(`shared_interests:+${pts}(count=${shared})`);
  }

  const locS = normalizedLocationLabel(searcher.facts.primaryLocationLabel);
  const locC = normalizedLocationLabel(candidate.facts.primaryLocationLabel);
  if (locS !== undefined && locC !== undefined && locS === locC) {
    rankScore += SCORE_SAME_LOCATION_LABEL;
    rankReasons.push(`same_location_label:+${SCORE_SAME_LOCATION_LABEL}`);
  }

  return { rankScore, rankReasons };
}

export interface RankedHolyGrailCandidate {
  readonly candidate: MatchingCanonicalModel;
  readonly rankScore: number;
  readonly rankReasons: readonly string[];
}

export interface HolyGrailCandidateRankingDebug {
  readonly inputTotal: number;
  readonly passedHardFilter: number;
  readonly failedHardFilter: number;
  readonly rankedCount: number;
}

export interface HolyGrailCandidateRankingResult {
  readonly rankedCandidates: readonly RankedHolyGrailCandidate[];
  readonly debug?: HolyGrailCandidateRankingDebug;
}

/**
 * Hard filter first (pairwise eligibility), then deterministic rank on survivors only.
 * No LLM, no soft preferences, no change to eligibility rules.
 */
export function rankHolyGrailCandidatesAfterHardFilter(args: {
  readonly searcher: MatchingCanonicalModel;
  readonly candidates: readonly MatchingCanonicalModel[];
  readonly evaluatedAt?: Date;
  readonly includeDebug?: boolean;
}): HolyGrailCandidateRankingResult {
  const evaluatedAt = args.evaluatedAt ?? new Date();
  const filterResult = filterCandidatesByHardEligibility({
    searcher: args.searcher,
    candidates: args.candidates,
    evaluatedAt,
    includeDebug: args.includeDebug === true,
  });

  const passed = filterResult.filteredCandidates;
  const rows: RankedHolyGrailCandidate[] = passed.map((candidate) => {
    const { rankScore, rankReasons } = computeRankScoreAndReasons(
      args.searcher,
      candidate,
      evaluatedAt,
    );
    return { candidate, rankScore, rankReasons };
  });

  rows.sort((a, b) => {
    if (b.rankScore !== a.rankScore) {
      return b.rankScore - a.rankScore;
    }
    return a.candidate.profileId.localeCompare(b.candidate.profileId);
  });

  return {
    rankedCandidates: rows,
    ...(args.includeDebug === true && filterResult.debug !== undefined
      ? {
          debug: {
            inputTotal: filterResult.debug.total,
            passedHardFilter: filterResult.debug.passed,
            failedHardFilter: filterResult.debug.failed,
            rankedCount: rows.length,
          },
        }
      : {}),
  };
}
