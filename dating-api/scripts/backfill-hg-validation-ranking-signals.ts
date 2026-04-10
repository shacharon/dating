/**
 * Backfills HG ranking-signal persistence for the synthetic HG validation pool only.
 * - Strips HG ranking keys from `ProfileEvaluationRaw.evaluation` JSON (source of truth: snapshot columns).
 * - Upserts ProfileSignalSnapshot domain `self` (numerics + `hgRanking*` typed columns from composed snapshot).
 *
 * Does not touch Holy Grail eligibility or ranking formulas.
 *
 * Run: npx ts-node scripts/backfill-hg-validation-ranking-signals.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS,
  ENRICHMENT_DAILY_RHYTHM_LABELS,
} from '../src/evaluate/enrichment-canonical-labels';
import type { EvaluateBatchResult } from '../src/evaluate/evaluate.service';
import {
  buildHolyGrailRankingSignalsFromDbSelfRow,
  composeHolyGrailRankingSignalsForPersist,
} from '../src/holy-grail-matching/holy-grail-ranking-signals-from-db';

const HG_RANKING_KEYS_OMIT_FROM_EVAL_JSON = [
  'dailyRhythm',
  'autonomyTogethernessDepth',
  'interestsTop3',
  'autonomyTogetherness',
  'interestsTop',
] as const;

function stripHgRankingKeysFromEvalJsonForDb(evaluation: EvaluateBatchResult): EvaluateBatchResult {
  const c = JSON.parse(JSON.stringify(evaluation)) as EvaluateBatchResult;
  const en = c.enrichment;
  if (!en || en.version !== 'v1' || !en.signals || typeof en.signals !== 'object') return c;
  const sig = en.signals as unknown as Record<string, unknown>;
  for (const k of HG_RANKING_KEYS_OMIT_FROM_EVAL_JSON) delete sig[k];
  return c;
}

const PREFIXES = ['synthetic-he-', 'synthetic-en-', 'synthetic-hg-gap-'] as const;

function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function pick<T extends readonly string[]>(id: string, salt: string, arr: T): T[number] {
  return arr[fnv1a32(`${id}|${salt}`) % arr.length]!;
}

/** Numeric 1.0–9.9 for snapshot floats (deterministic). */
function stableFloat(id: string, salt: string): number {
  const x = fnv1a32(`${id}|${salt}`) % 900;
  return Math.round((1 + x / 100) * 10) / 10;
}

type Coverage = {
  dailyRhythm: number;
  autonomyTogetherness: number;
  conflictStyle: number;
  lifestylePace: number;
  interestsTop: number;
  total: number;
};

function snapshotCoverage(
  rows: {
    id: string;
    signalSnapshots: {
      lifestylePace: number | null;
      conflictStyle: number | null;
      hgRankingDailyRhythm: string | null;
      hgRankingAutonomyTogetherness: string | null;
      hgRankingInterestsTop: string[];
    }[];
  }[],
): Coverage {
  const c: Coverage = {
    dailyRhythm: 0,
    autonomyTogetherness: 0,
    conflictStyle: 0,
    lifestylePace: 0,
    interestsTop: 0,
    total: rows.length,
  };
  for (const row of rows) {
    const self = row.signalSnapshots[0];
    const snap = buildHolyGrailRankingSignalsFromDbSelfRow(self ?? null);
    if (snap.dailyRhythm) c.dailyRhythm += 1;
    if (snap.autonomyTogetherness) c.autonomyTogetherness += 1;
    if (snap.conflictStyle !== null) c.conflictStyle += 1;
    if (snap.lifestylePace !== null) c.lifestylePace += 1;
    if (snap.interestsTop.length > 0) c.interestsTop += 1;
  }
  return c;
}

function pct(n: number, d: number): string {
  if (d === 0) return '0%';
  return `${Math.round((10000 * n) / d) / 100}%`;
}

async function loadPool(prisma: PrismaClient) {
  return prisma.userProfile.findMany({
    where: { OR: PREFIXES.map((p) => ({ id: { startsWith: p } })) },
    orderBy: { id: 'asc' },
    include: {
      extractionV2: { select: { interests_self: true } },
      evaluationRaw: { select: { evaluation: true } },
      signalSnapshots: { where: { domain: 'self' } },
    },
  });
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const beforeRows = await loadPool(prisma);
    const before = snapshotCoverage(beforeRows);

    let updatedEval = 0;
    let updatedSnap = 0;

    for (const row of beforeRows) {
      const dr = pick(row.id, 'dr', ENRICHMENT_DAILY_RHYTHM_LABELS);
      const at = pick(row.id, 'at', ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS);
      const rawTags = row.extractionV2?.interests_self ?? [];
      const cleaned = rawTags
        .filter((x) => typeof x === 'string' && x.trim() !== '')
        .map((x) => x.trim())
        .slice(0, 3);
      const interestsTop3 =
        cleaned.length > 0
          ? cleaned
          : [
              pick(row.id, 'it0', ['reading', 'music', 'travel', 'cooking', 'hiking'] as const),
              pick(row.id, 'it1', ['yoga', 'film', 'gaming', 'art', 'running'] as const),
              pick(row.id, 'it2', ['photography', 'food', 'dogs', 'tech', 'nature'] as const),
            ];

      const rankingSourceEval = {
        enrichment: {
          version: 'v1' as const,
          signals: {
            dailyRhythm: dr,
            autonomyTogethernessDepth: at,
            kidsTimeline: null,
            conflictStyleDetail: null,
            interestsTop3,
          },
        },
      } as EvaluateBatchResult;

      const baseEval = (row.evaluationRaw?.evaluation as EvaluateBatchResult | undefined) ?? rankingSourceEval;
      const evaluationForDb = stripHgRankingKeysFromEvalJsonForDb(baseEval);

      await prisma.profileEvaluationRaw.upsert({
        where: { profileId: row.id },
        create: { profileId: row.id, evaluation: evaluationForDb as object },
        update: { evaluation: evaluationForDb as object },
      });
      updatedEval += 1;

      const lifestylePace = stableFloat(row.id, 'lifestylePace');
      const conflictStyle = stableFloat(row.id, 'conflictStyle');

      const composed = composeHolyGrailRankingSignalsForPersist({
        evaluation: rankingSourceEval,
        interestsSelf: row.extractionV2?.interests_self,
        signalSelfNumerics: { lifestylePace, conflictStyle },
      });

      await prisma.profileSignalSnapshot.upsert({
        where: { profileId_domain: { profileId: row.id, domain: 'self' } },
        create: {
          profileId: row.id,
          domain: 'self',
          lifestylePace,
          conflictStyle,
          hgRankingDailyRhythm: composed.dailyRhythm,
          hgRankingAutonomyTogetherness: composed.autonomyTogetherness,
          hgRankingInterestsTop: [...composed.interestsTop],
        },
        update: {
          lifestylePace,
          conflictStyle,
          hgRankingDailyRhythm: composed.dailyRhythm,
          hgRankingAutonomyTogetherness: composed.autonomyTogetherness,
          hgRankingInterestsTop: [...composed.interestsTop],
        },
      });
      updatedSnap += 1;
    }

    const afterRows = await loadPool(prisma);
    const after = snapshotCoverage(afterRows);

    console.log(
      JSON.stringify(
        {
          profiles: beforeRows.length,
          profileEvaluationRawUpserts: updatedEval,
          profileSignalSnapshotSelfUpserts: updatedSnap,
          coverageBefore: {
            ...before,
            dailyRhythmPct: pct(before.dailyRhythm, before.total),
            autonomyTogethernessPct: pct(before.autonomyTogetherness, before.total),
            conflictStylePct: pct(before.conflictStyle, before.total),
            lifestylePacePct: pct(before.lifestylePace, before.total),
            interestsTopPct: pct(before.interestsTop, before.total),
          },
          coverageAfter: {
            ...after,
            dailyRhythmPct: pct(after.dailyRhythm, after.total),
            autonomyTogethernessPct: pct(after.autonomyTogetherness, after.total),
            conflictStylePct: pct(after.conflictStyle, after.total),
            lifestylePacePct: pct(after.lifestylePace, after.total),
            interestsTopPct: pct(after.interestsTop, after.total),
          },
        },
        null,
        2,
      ),
    );

    const summary = {
      beforePct: {
        dailyRhythm: pct(before.dailyRhythm, before.total),
        autonomyTogetherness: pct(before.autonomyTogetherness, before.total),
        conflictStyle: pct(before.conflictStyle, before.total),
        lifestylePace: pct(before.lifestylePace, before.total),
        interestsTop: pct(before.interestsTop, before.total),
      },
      afterPct: {
        dailyRhythm: pct(after.dailyRhythm, after.total),
        autonomyTogetherness: pct(after.autonomyTogetherness, after.total),
        conflictStyle: pct(after.conflictStyle, after.total),
        lifestylePace: pct(after.lifestylePace, after.total),
        interestsTop: pct(after.interestsTop, after.total),
      },
    };
    console.log('\n--- coverage % summary ---\n', JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
