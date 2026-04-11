/**
 * Audit: READY pairs where legacy finalScore is "strong" (>=65) but HG purity primary
 * signals are mostly missing — HG rank and match-engine score are decoupled.
 *
 * Run from dating-api: npx ts-node --transpile-only scripts/hg-strong-low-evidence-audit.ts
 *
 * Cohort (bounded): recent profiles with evaluation+raw → hasAnalyzedSignals → cap N → all READY pairs.
 */
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SimpleLoggerModule } from '../src/logger/simple-logger.module';
import { ProfilesPrismaService } from '../src/profiles/profiles-prisma.service';
import type { ProfileJsonPayload } from '../src/profiles/profiles.types';
import { compareWithStatus, hasAnalyzedSignals } from '../src/matches/match-engine';
import type { CompareResultDto } from '../src/matches/match-engine';
import { toCanonicalMatchId } from '../src/matches/match-id';
import type { ChildrenUnsureProfileRow } from '../src/matches/children-unsure-profile-row.types';
import { buildHolyGrailProfileMappingInputFromRankingAwareDbRow } from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import {
  computeHolyGrailFiveSignalRank,
  computeHolyGrailRankingPurityRank,
} from '../src/holy-grail-matching/holy-grail-five-signal-ranking';

const FETCH_CANDIDATES = 600;
const MAX_ANALYZED = 52;
const STRONG_THRESHOLD = 65;
const PRIMARY = new Set([
  'dailyRhythm',
  'autonomyTogetherness',
  'conflictStyle',
  'lifestylePace',
  'interestsTop',
]);
const ENRICHMENT = new Set(['personalityTraits', 'lifestyleSignals', 'interestTags']);

function countNonZeroPrimary(
  breakdown: readonly { signal: string; points: number }[],
): number {
  return breakdown.filter((x) => PRIMARY.has(x.signal) && x.points > 1e-6).length;
}

function onlyLifestylePacePrimary(
  breakdown: readonly { signal: string; points: number }[],
): boolean {
  if (countNonZeroPrimary(breakdown) !== 1) return false;
  const lp = breakdown.find((x) => x.signal === 'lifestylePace');
  return lp != null && lp.points > 1e-6;
}

function enrichmentPointsSum(
  breakdown: readonly { signal: string; points: number }[],
): number {
  return breakdown.filter((x) => ENRICHMENT.has(x.signal)).reduce((a, x) => a + x.points, 0);
}

function buildRecords(
  profiles: ProfileJsonPayload[],
): { matchId: string; aId: string; bId: string; final: CompareResultDto }[] {
  const byId = new Map(profiles.map((p) => [p.id, p] as const));
  const ids = profiles.map((p) => p.id).sort((a, b) => a.localeCompare(b));
  const out: { matchId: string; aId: string; bId: string; final: CompareResultDto }[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const aId = ids[i]!;
      const bId = ids[j]!;
      const pa = byId.get(aId);
      const pb = byId.get(bId);
      if (!pa || !pb) continue;
      const r = compareWithStatus(pa, pb);
      if ('status' in r && (r.status === 'NOT_ANALYZED' || r.status === 'INSUFFICIENT_DATA')) continue;
      const final = r as CompareResultDto;
      out.push({ matchId: toCanonicalMatchId(aId, bId), aId, bId, final });
    }
  }
  return out;
}

async function main() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
      PrismaModule,
      SimpleLoggerModule,
    ],
    providers: [ProfilesPrismaService],
  }).compile();

  const prisma = moduleRef.get(PrismaService);
  const profilesPrisma = moduleRef.get(ProfilesPrismaService);

  const recent = await prisma.userProfile.findMany({
    where: {
      evaluation: { evaluatedAt: { not: null } },
      evaluationRaw: { isNot: null },
    },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
    take: FETCH_CANDIDATES,
  });
  const loaded = await profilesPrisma.loadMatchListProfileDataForSubset(recent.map((x) => x.id));
  const profiles = loaded.profiles.filter((p) => hasAnalyzedSignals(p)).slice(0, MAX_ANALYZED);
  const idSet = new Set(profiles.map((p) => p.id));
  const holyRows = new Map(
    [...loaded.holyGrailRowsById].filter(([id]) => idSet.has(id)),
  ) as Map<string, ChildrenUnsureProfileRow>;

  const pairs = buildRecords(profiles);

  let strong = 0;
  /** Strong and both directions have ≤1 non-zero five-signal HG primary. */
  let strongPrimary0Or1BothDirs = 0;
  let strongNoEnrichmentBothDirs = 0;
  let strongLifestylePaceOnlyEitherDir = 0;
  let strongPrimary0Or1BothDirsAndNoEnrich = 0;

  type Row = {
    matchId: string;
    aId: string;
    bId: string;
    finalScore: number;
    confidence: number;
    coveragePercent: number;
    nonZeroPrimaryAb: number;
    nonZeroPrimaryBa: number;
    enrichSumAb: number;
    enrichSumBa: number;
    purityAb: number;
    lifestyleOnlyAb: boolean;
    primaryNotesAb: string;
  };

  const detailRows: Row[] = [];

  for (const p of pairs) {
    const fs = p.final.finalScore;
    if (fs < STRONG_THRESHOLD) continue;
    strong += 1;

    const rowA = holyRows.get(p.aId);
    const rowB = holyRows.get(p.bId);
    if (!rowA || !rowB) continue;

    const canonA = mapProfileSourceToMatchingCanonical(
      buildHolyGrailProfileMappingInputFromRankingAwareDbRow(rowA),
    );
    const canonB = mapProfileSourceToMatchingCanonical(
      buildHolyGrailProfileMappingInputFromRankingAwareDbRow(rowB),
    );
    const purityAb = computeHolyGrailRankingPurityRank({ searcher: canonA, candidate: canonB });
    const purityBa = computeHolyGrailRankingPurityRank({ searcher: canonB, candidate: canonA });
    const fullAb = computeHolyGrailFiveSignalRank({ searcher: canonA, candidate: canonB });
    const fullBa = computeHolyGrailFiveSignalRank({ searcher: canonB, candidate: canonA });

    const nzAb = countNonZeroPrimary(purityAb.rankBreakdown);
    const nzBa = countNonZeroPrimary(purityBa.rankBreakdown);
    const eAb = enrichmentPointsSum(fullAb.rankBreakdown);
    const eBa = enrichmentPointsSum(fullBa.rankBreakdown);

    const primaryNotesAb = purityAb.rankBreakdown
      .filter((x) => PRIMARY.has(x.signal))
      .map((x) => `${x.signal}:${Math.round(x.points * 1e4) / 1e4}`)
      .join(';');

    /** Both directions sparse on the five persisted primaries (typical "low HG evidence"). */
    if (nzAb <= 1 && nzBa <= 1) strongPrimary0Or1BothDirs += 1;
    if (eAb < 1e-9 && eBa < 1e-9) strongNoEnrichmentBothDirs += 1;
    if (onlyLifestylePacePrimary(purityAb.rankBreakdown) || onlyLifestylePacePrimary(purityBa.rankBreakdown)) {
      strongLifestylePaceOnlyEitherDir += 1;
    }
    if (nzAb <= 1 && nzBa <= 1 && eAb < 1e-9 && eBa < 1e-9) {
      strongPrimary0Or1BothDirsAndNoEnrich += 1;
    }

    detailRows.push({
      matchId: p.matchId,
      aId: p.aId,
      bId: p.bId,
      finalScore: fs,
      confidence: p.final.confidence,
      coveragePercent: p.final.coveragePercent,
      nonZeroPrimaryAb: nzAb,
      nonZeroPrimaryBa: nzBa,
      enrichSumAb: eAb,
      enrichSumBa: eBa,
      purityAb: purityAb.rankScore,
      lifestyleOnlyAb: onlyLifestylePacePrimary(purityAb.rankBreakdown),
      primaryNotesAb,
    });
  }

  const pct = (num: number, den: number) =>
    den === 0 ? 0 : Math.round((1e4 * num) / den) / 100;

  detailRows.sort((a, b) => a.finalScore - b.finalScore);
  const examples = detailRows
    .filter((r) => r.nonZeroPrimaryAb <= 1 && r.nonZeroPrimaryBa <= 1 && r.enrichSumAb < 1e-9 && r.enrichSumBa < 1e-9)
    .slice(0, 10);

  const report = {
    cohort: {
      fetchProfiles: FETCH_CANDIDATES,
      analyzedProfilesUsed: profiles.length,
      readyPairs: pairs.length,
      note: 'Metrics are for this cohort only (not all DB × DB pairs).',
    },
    strongThreshold: STRONG_THRESHOLD,
    counts: {
      strongMatches: strong,
      strong_with_atMost1nonZeroPrimary_bothDirections: strongPrimary0Or1BothDirs,
      strong_with_noEnrichmentPoints_bothDirections: strongNoEnrichmentBothDirs,
      strong_with_lifestylePaceOnlyPrimary_eitherDirection: strongLifestylePaceOnlyEitherDir,
      strong_sparsePrimary_bothDirs_and_noEnrichment: strongPrimary0Or1BothDirsAndNoEnrich,
    },
    pct_of_strong: {
      sparsePrimary_bothDirs_pct: pct(strongPrimary0Or1BothDirs, strong),
      noEnrichment_bothDirs_pct: pct(strongNoEnrichmentBothDirs, strong),
      lifestylePaceOnlyPrimary_eitherDir_pct: pct(strongLifestylePaceOnlyEitherDir, strong),
      sparsePrimary_and_noEnrichment_pct: pct(strongPrimary0Or1BothDirsAndNoEnrich, strong),
    },
    pct_of_ready: {
      strong_pct: pct(strong, pairs.length),
    },
    examples_lowHgEvidenceStrong: examples.map((r) => ({
      matchId: r.matchId,
      profileIds: [r.aId, r.bId],
      finalScore: r.finalScore,
      confidence: Math.round(r.confidence * 1000) / 1000,
      coveragePercent: r.coveragePercent,
      hgPurity_nonZeroPrimary_ab_ba: [r.nonZeroPrimaryAb, r.nonZeroPrimaryBa],
      hgPurity_rankScore_ab: r.purityAb,
      enrichmentPointsSum_ab_ba: [Math.round(r.enrichSumAb * 1e6) / 1e6, Math.round(r.enrichSumBa * 1e6) / 1e6],
      primaryBreakdown_ab: r.primaryNotesAb,
      lifestylePaceOnly_ab: r.lifestyleOnlyAb,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
  await moduleRef.close();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
