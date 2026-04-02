/**
 * Backfill evaluation.enrichment for real profiles only.
 *
 * Merges enrichment into existing ProfileEvaluationRaw JSON only:
 * does not touch UserProfile texts, ProfileSignalSnapshot, ProfileEvaluation meta,
 * or any core evaluation fields (self/partner/relationship, scores, chips, etc.).
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/backfill-evaluation-enrichment.ts
 *   npx ts-node --transpile-only scripts/backfill-evaluation-enrichment.ts --dry-run=true
 *   npx ts-node --transpile-only scripts/backfill-evaluation-enrichment.ts --limit=100 --concurrency=4
 */

import { Prisma, PrismaClient } from '@prisma/client';
import {
  buildEnrichmentSignals,
  sanitizeEnrichmentSignalsV1,
  wrapEnrichmentV1,
} from '../src/evaluate/enrichment-signals';
import type { EnrichmentSignalsV1 } from '../src/evaluate/enrichment-signals';

function parseArgs(): {
  dryRun: boolean;
  limit?: number;
  offset: number;
  concurrency: number;
  sampleSize: number;
  progressEvery: number;
} {
  const args = process.argv.slice(2);
  const byKey = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg || !arg.startsWith('--')) continue;
    const body = arg.slice(2);
    if (body.includes('=')) {
      const [k, ...rest] = body.split('=');
      byKey.set(k, rest.join('='));
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      byKey.set(body, next);
      i += 1;
    } else {
      byKey.set(body, 'true');
    }
  }
  const dryRun = (byKey.get('dry-run') || 'false').toLowerCase() === 'true';
  const limitRaw = byKey.get('limit');
  const limit =
    limitRaw && Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : undefined;
  const offsetRaw = Number(byKey.get('offset') || '0');
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const concurrencyRaw = Number(byKey.get('concurrency') || '4');
  const concurrency = Number.isFinite(concurrencyRaw)
    ? Math.max(1, Math.min(16, Math.floor(concurrencyRaw)))
    : 4;
  const sampleSizeRaw = Number(byKey.get('sample-size') || '15');
  const sampleSize = Number.isFinite(sampleSizeRaw)
    ? Math.max(10, Math.min(15, Math.floor(sampleSizeRaw)))
    : 15;
  const progressEveryRaw = Number(byKey.get('progress-every') || '50');
  const progressEvery = Number.isFinite(progressEveryRaw) ? Math.max(1, progressEveryRaw) : 50;
  return { dryRun, limit, offset, concurrency, sampleSize, progressEvery };
}

function isRealProfile(id: string, name: string): boolean {
  const s = `${id} ${name}`.toLowerCase();
  const banned = ['test', 'verify', 'debug', 'canonical', 'clarity', 'stub'];
  return !banned.some((token) => s.includes(token));
}

function textLength(row: {
  aboutMe: string;
  aboutPartner: string | null;
  aboutRelationship: string | null;
}): number {
  const a = row.aboutMe?.trim() ?? '';
  const b = row.aboutPartner?.trim() ?? '';
  const c = row.aboutRelationship?.trim() ?? '';
  return a.length + b.length + c.length;
}

function isPlainEvaluationJson(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function hasStructuralSignals(s: EnrichmentSignalsV1): boolean {
  return !!(
    s.dailyRhythm ||
    s.autonomyTogethernessDepth ||
    s.kidsTimeline ||
    s.conflictStyleDetail
  );
}

function parseStoredEnrichmentSignals(rawEval: Record<string, unknown>): EnrichmentSignalsV1 | null {
  const en = rawEval.enrichment;
  if (!en || typeof en !== 'object' || Array.isArray(en)) return null;
  const o = en as Record<string, unknown>;
  if (o.version !== 'v1') return null;
  const sig = o.signals;
  if (!sig || typeof sig !== 'object' || Array.isArray(sig)) return null;
  const s = sig as Record<string, unknown>;
  const interests = Array.isArray(s.interestsTop3)
    ? s.interestsTop3.filter((x): x is string => typeof x === 'string')
    : [];
  return sanitizeEnrichmentSignalsV1({
    dailyRhythm: typeof s.dailyRhythm === 'string' ? s.dailyRhythm : null,
    autonomyTogethernessDepth:
      typeof s.autonomyTogethernessDepth === 'string' ? s.autonomyTogethernessDepth : null,
    kidsTimeline: typeof s.kidsTimeline === 'string' ? s.kidsTimeline : null,
    conflictStyleDetail:
      typeof s.conflictStyleDetail === 'string' ? s.conflictStyleDetail : null,
    interestsTop3: interests,
  });
}

function coverageStats(rows: EnrichmentSignalsV1[]): {
  n: number;
  dailyRhythmPct: number;
  autonomyTogethernessDepthPct: number;
  kidsTimelinePct: number;
  conflictStyleDetailPct: number;
  interestsTop3AnyPct: number;
  interestsTop3AvgLen: number;
  structuralAnyPct: number;
} {
  const n = rows.length;
  if (n === 0) {
    return {
      n: 0,
      dailyRhythmPct: 0,
      autonomyTogethernessDepthPct: 0,
      kidsTimelinePct: 0,
      conflictStyleDetailPct: 0,
      interestsTop3AnyPct: 0,
      interestsTop3AvgLen: 0,
      structuralAnyPct: 0,
    };
  }
  const count = (pred: (r: EnrichmentSignalsV1) => boolean) =>
    rows.filter(pred).length;
  const sumInterests = rows.reduce((acc, r) => acc + (r.interestsTop3?.length ?? 0), 0);
  return {
    n,
    dailyRhythmPct: Math.round((100 * count((r) => r.dailyRhythm != null)) / n),
    autonomyTogethernessDepthPct: Math.round(
      (100 * count((r) => r.autonomyTogethernessDepth != null)) / n,
    ),
    kidsTimelinePct: Math.round((100 * count((r) => r.kidsTimeline != null)) / n),
    conflictStyleDetailPct: Math.round((100 * count((r) => r.conflictStyleDetail != null)) / n),
    interestsTop3AnyPct: Math.round(
      (100 * count((r) => Array.isArray(r.interestsTop3) && r.interestsTop3.length > 0)) / n,
    ),
    interestsTop3AvgLen: Math.round((1000 * sumInterests) / n) / 1000,
    structuralAnyPct: Math.round((100 * count(hasStructuralSignals)) / n),
  };
}

async function main(): Promise<void> {
  const { dryRun, limit, offset, concurrency, sampleSize, progressEvery } = parseArgs();
  const prisma = new PrismaClient();

  const allRows = await prisma.userProfile.findMany({
    include: {
      evaluationRaw: { select: { evaluation: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });

  const realRows = allRows.filter((r) => isRealProfile(r.id, r.name));
  const withRaw = realRows.filter((r) => r.evaluationRaw?.evaluation != null);
  const eligible = withRaw.filter((r) => textLength(r) >= 30);
  const windowed = (limit ? eligible.slice(offset, offset + limit) : eligible.slice(offset)).filter(
    Boolean,
  );

  console.log(
    `[enrichment-backfill] start dryRun=${dryRun} realInDb=${realRows.length} withEvaluationRaw=${withRaw.length} eligibleText>=30=${eligible.length} window=${windowed.length} offset=${offset} limit=${limit ?? 'ALL'} concurrency=${concurrency}`,
  );

  let updated = 0;
  let skippedNoRaw = 0;
  let skippedShortText = 0;
  let skippedInvalidJson = 0;
  let failed = 0;
  const signalRows: EnrichmentSignalsV1[] = [];
  const samplePool: Array<{ id: string; name: string; signals: EnrichmentSignalsV1 }> = [];
  const beforeAfterSamples: Array<{
    id: string;
    name: string;
    before: EnrichmentSignalsV1 | null;
    after: EnrichmentSignalsV1;
  }> = [];

  let cursor = 0;
  let visited = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= windowed.length) return;
      const row = windowed[i];
      try {
        if (!row.evaluationRaw?.evaluation) {
          skippedNoRaw += 1;
        } else if (textLength(row) < 30) {
          skippedShortText += 1;
        } else {
          const rawEval = row.evaluationRaw.evaluation;
          if (!isPlainEvaluationJson(rawEval)) {
            skippedInvalidJson += 1;
          } else {
            const signals = buildEnrichmentSignals(
              row.aboutMe.trim(),
              (row.aboutPartner ?? '').trim(),
              (row.aboutRelationship ?? '').trim(),
            );
            const enrichment = wrapEnrichmentV1(signals);
            const merged = { ...rawEval, enrichment } as unknown as Prisma.InputJsonValue;

            if (beforeAfterSamples.length < 10) {
              const beforeSnap = parseStoredEnrichmentSignals(rawEval);
              beforeAfterSamples.push({
                id: row.id,
                name: row.name,
                before: beforeSnap
                  ? {
                      dailyRhythm: beforeSnap.dailyRhythm,
                      autonomyTogethernessDepth: beforeSnap.autonomyTogethernessDepth,
                      kidsTimeline: beforeSnap.kidsTimeline,
                      conflictStyleDetail: beforeSnap.conflictStyleDetail,
                      interestsTop3: [...beforeSnap.interestsTop3],
                    }
                  : null,
                after: {
                  dailyRhythm: signals.dailyRhythm,
                  autonomyTogethernessDepth: signals.autonomyTogethernessDepth,
                  kidsTimeline: signals.kidsTimeline,
                  conflictStyleDetail: signals.conflictStyleDetail,
                  interestsTop3: [...signals.interestsTop3],
                },
              });
            }

            if (!dryRun) {
              await prisma.profileEvaluationRaw.update({
                where: { profileId: row.id },
                data: { evaluation: merged },
              });
            }
            updated += 1;
            signalRows.push(signals);
            samplePool.push({ id: row.id, name: row.name, signals });
          }
        }
      } catch (e) {
        failed += 1;
        console.log(
          `[enrichment-backfill] fail id=${row.id} ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      visited += 1;
      if (visited % progressEvery === 0 || visited === windowed.length) {
        console.log(
          `[enrichment-backfill] progress visited=${visited}/${windowed.length} updated=${updated} failed=${failed}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const stats = coverageStats(signalRows);

  function richness(s: EnrichmentSignalsV1): number {
    let n = 0;
    if (s.dailyRhythm) n += 2;
    if (s.autonomyTogethernessDepth) n += 2;
    if (s.kidsTimeline) n += 2;
    if (s.conflictStyleDetail) n += 2;
    n += Math.min(3, s.interestsTop3?.length ?? 0);
    return n;
  }

  const samples = [...samplePool]
    .sort((a, b) => richness(b.signals) - richness(a.signals) || a.id.localeCompare(b.id))
    .slice(0, sampleSize);

  console.log('[enrichment-backfill] batch-summary', {
    windowed: windowed.length,
    updated,
    skippedNoRaw,
    skippedShortText,
    skippedInvalidJson,
    failed,
    dryRun,
  });

  const structuralEligible = signalRows.filter(hasStructuralSignals).length;

  console.log('[enrichment-backfill] coverage-report (among successfully processed rows)', {
    n: stats.n,
    structural_any_pct: stats.structuralAnyPct,
    dailyRhythm_pct: stats.dailyRhythmPct,
    autonomyTogethernessDepth_pct: stats.autonomyTogethernessDepthPct,
    kidsTimeline_pct: stats.kidsTimelinePct,
    conflictStyleDetail_pct: stats.conflictStyleDetailPct,
    interestsTop3_any_pct: stats.interestsTop3AnyPct,
    interestsTop3_avg_len: stats.interestsTop3AvgLen,
  });

  console.log('[enrichment-backfill] default-primary-ui-eligible', {
    count: structuralEligible,
    amongProcessedPct: stats.n ? Math.round((100 * structuralEligible) / stats.n) : 0,
    note: 'Profiles with at least one of dailyRhythm, autonomyTogethernessDepth, kidsTimeline, conflictStyleDetail',
  });

  console.log(`[enrichment-backfill] before-after-samples n=${beforeAfterSamples.length}`);
  for (const row of beforeAfterSamples) {
    console.log(
      JSON.stringify({
        id: row.id,
        name: row.name,
        before: row.before,
        after: row.after,
      }),
    );
  }

  console.log(`[enrichment-backfill] sample-profiles n=${samples.length}`);
  for (const s of samples) {
    console.log(
      JSON.stringify({
        id: s.id,
        name: s.name,
        enrichment: { version: 'v1', signals: s.signals },
      }),
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
