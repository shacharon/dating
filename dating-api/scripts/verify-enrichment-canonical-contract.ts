/**
 * Contract verification: enrichment four core fields vs canonical / phrase / null.
 *
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/verify-enrichment-canonical-contract.ts
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/verify-enrichment-canonical-contract.ts --limit=50
 */

import { PrismaClient } from '@prisma/client';
import {
  ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS,
  ENRICHMENT_CONFLICT_STYLE_DETAIL_LABELS,
  ENRICHMENT_DAILY_RHYTHM_LABELS,
  ENRICHMENT_KIDS_TIMELINE_LABELS,
  coerceEnrichmentAutonomyTogetherness,
  coerceEnrichmentConflictStyleDetail,
  coerceEnrichmentDailyRhythm,
  coerceEnrichmentKidsTimeline,
} from '../src/evaluate/enrichment-canonical-labels';
import { sanitizeEnrichmentSignalsV1 } from '../src/evaluate/enrichment-signals';

const FIELD_KEYS = [
  'dailyRhythm',
  'autonomyTogethernessDepth',
  'kidsTimeline',
  'conflictStyleDetail',
] as const;

type FieldKey = (typeof FIELD_KEYS)[number];

const LABEL_SETS: Record<FieldKey, ReadonlySet<string>> = {
  dailyRhythm: new Set(ENRICHMENT_DAILY_RHYTHM_LABELS),
  autonomyTogethernessDepth: new Set(ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS),
  kidsTimeline: new Set(ENRICHMENT_KIDS_TIMELINE_LABELS),
  conflictStyleDetail: new Set(ENRICHMENT_CONFLICT_STYLE_DETAIL_LABELS),
};

function snakeish(s: string): string {
  return s.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Stored value already exact snake_case or equivalent spacing/hyphen variant. */
function isStoredCanonical(field: FieldKey, raw: string | null | undefined): boolean {
  if (raw == null || typeof raw !== 'string') return false;
  const t = raw.trim();
  if (!t) return false;
  const set = LABEL_SETS[field];
  return set.has(t) || set.has(snakeish(t));
}

function coerceField(field: FieldKey, raw: string | null | undefined): string | null {
  switch (field) {
    case 'dailyRhythm':
      return coerceEnrichmentDailyRhythm(raw);
    case 'autonomyTogethernessDepth':
      return coerceEnrichmentAutonomyTogetherness(raw);
    case 'kidsTimeline':
      return coerceEnrichmentKidsTimeline(raw);
    case 'conflictStyleDetail':
      return coerceEnrichmentConflictStyleDetail(raw);
    default:
      return null;
  }
}

type Bucket = 'canonical_stored' | 'phrase_stored' | 'null';

function classifyRaw(field: FieldKey, raw: string | null | undefined): Bucket {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return 'null';
  const coerced = coerceField(field, raw);
  if (coerced === null) return 'null';
  if (isStoredCanonical(field, raw)) return 'canonical_stored';
  return 'phrase_stored';
}

function parseEnrichmentSignals(
  evaluation: unknown,
): Record<FieldKey, string | null> | null {
  if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation)) return null;
  const en = (evaluation as Record<string, unknown>).enrichment;
  if (!en || typeof en !== 'object' || Array.isArray(en)) return null;
  if ((en as Record<string, unknown>).version !== 'v1') return null;
  const sig = (en as Record<string, unknown>).signals;
  if (!sig || typeof sig !== 'object' || Array.isArray(sig)) return null;
  const s = sig as Record<string, unknown>;
  const str = (k: FieldKey): string | null =>
    typeof s[k] === 'string' ? (s[k] as string) : null;
  return {
    dailyRhythm: str('dailyRhythm'),
    autonomyTogethernessDepth: str('autonomyTogethernessDepth'),
    kidsTimeline: str('kidsTimeline'),
    conflictStyleDetail: str('conflictStyleDetail'),
  };
}

/** Multi-token human-ish string still in DB (not canonical snake form). */
function looksPhraseShaped(s: string | null | undefined): boolean {
  if (s == null || typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  return /\s/.test(t) || /[A-Z]/.test(t);
}

function parseArgs(): { limit: number; recentDays: number } {
  const args = process.argv.slice(2);
  let limit = 50;
  let recentDays = 14;
  for (const a of args) {
    if (a.startsWith('--limit=')) {
      const v = a.slice(8).trim().toLowerCase();
      if (v === 'all' || v === '0') limit = 1_000_000;
      else limit = Math.max(1, parseInt(a.slice(8), 10) || 50);
    }
    if (a.startsWith('--recent-days='))
      recentDays = Math.max(1, parseInt(a.slice(14), 10) || 14);
  }
  return { limit, recentDays };
}

async function main(): Promise<void> {
  const { limit, recentDays } = parseArgs();
  const prisma = new PrismaClient();
  const recentCutoff = new Date(Date.now() - recentDays * 86_400_000);

  try {
    const rows = await prisma.userProfile.findMany({
      where: { evaluationRaw: { isNot: null } },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        evaluationRaw: { select: { evaluation: true } },
        evaluation: { select: { evaluatedAt: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: limit,
    });

    const counts = {
      raw: { canonical_stored: 0, phrase_stored: 0, null: 0 },
      after: { canonical_stored: 0, phrase_stored: 0, null: 0 },
    };

    let totalObs = 0;
    const samples: Array<{
      id: string;
      evaluatedAt: string | null;
      raw: Record<FieldKey, string | null>;
      after: Record<FieldKey, string | null>;
      repairedFields: FieldKey[];
    }> = [];

    let recentWithPhraseShapedRaw = 0;
    let garbageRawFields = 0;
    const garbageByField: Record<FieldKey, Array<{ id: string; value: string }>> = {
      dailyRhythm: [],
      autonomyTogethernessDepth: [],
      kidsTimeline: [],
      conflictStyleDetail: [],
    };

    const rowMeta: Array<{
      row: (typeof rows)[0];
      rawSig: Record<FieldKey, string | null>;
      afterSig: ReturnType<typeof sanitizeEnrichmentSignalsV1>;
      repairedFields: FieldKey[];
      score: number;
    }> = [];

    for (const row of rows) {
      const evaluation = row.evaluationRaw?.evaluation;
      const rawSig = parseEnrichmentSignals(evaluation);
      if (!rawSig) continue;

      const interests =
        evaluation &&
        typeof evaluation === 'object' &&
        !Array.isArray(evaluation) &&
        typeof (evaluation as Record<string, unknown>).enrichment === 'object'
          ? (
              (
                (evaluation as Record<string, unknown>).enrichment as Record<string, unknown>
              ).signals as Record<string, unknown> | undefined
            )?.interestsTop3
          : undefined;
      const afterSig = sanitizeEnrichmentSignalsV1({
        ...rawSig,
        interestsTop3: Array.isArray(interests)
          ? interests.filter((x): x is string => typeof x === 'string')
          : [],
      });

      const repairedFields: FieldKey[] = [];
      for (const k of FIELD_KEYS) {
        totalObs += 1;
        const bRaw = classifyRaw(k, rawSig[k]);
        counts.raw[bRaw] += 1;
        const afterVal = afterSig[k];
        const bAfter: Bucket =
          afterVal === null || afterVal === undefined
            ? 'null'
            : isStoredCanonical(k, afterVal)
              ? 'canonical_stored'
              : 'phrase_stored';
        counts.after[bAfter] += 1;

        const cr = coerceField(k, rawSig[k]);
        if (rawSig[k] && String(rawSig[k]).trim() && cr !== null && !isStoredCanonical(k, rawSig[k])) {
          repairedFields.push(k);
        }
        if (
          rawSig[k] &&
          String(rawSig[k]).trim() &&
          coerceField(k, rawSig[k]) === null
        ) {
          garbageRawFields += 1;
          const bucket = garbageByField[k];
          if (bucket.length < 10) {
            bucket.push({ id: row.id, value: String(rawSig[k]).slice(0, 120) });
          }
        }
      }

      const evalAt = row.evaluation?.evaluatedAt ?? null;
      const isRecent = evalAt && evalAt >= recentCutoff;
      const phraseShaped = FIELD_KEYS.some((k) => looksPhraseShaped(rawSig[k]));
      if (isRecent && phraseShaped) recentWithPhraseShapedRaw += 1;

      const phraseCount = FIELD_KEYS.filter(
        (k) => classifyRaw(k, rawSig[k]) === 'phrase_stored',
      ).length;
      const nonNull = FIELD_KEYS.filter((k) => rawSig[k] != null && String(rawSig[k]).trim() !== '')
        .length;
      const score = phraseCount * 100 + nonNull;
      rowMeta.push({
        row,
        rawSig,
        afterSig,
        repairedFields: [...new Set(repairedFields)],
        score,
      });
    }

    rowMeta.sort((a, b) => b.score - a.score);
    for (const m of rowMeta.slice(0, 10)) {
      const evalAt = m.row.evaluation?.evaluatedAt ?? null;
      samples.push({
        id: m.row.id,
        evaluatedAt: evalAt ? evalAt.toISOString() : null,
        raw: { ...m.rawSig },
        after: {
          dailyRhythm: m.afterSig.dailyRhythm,
          autonomyTogethernessDepth: m.afterSig.autonomyTogethernessDepth,
          kidsTimeline: m.afterSig.kidsTimeline,
          conflictStyleDetail: m.afterSig.conflictStyleDetail,
        },
        repairedFields: m.repairedFields,
      });
    }

    const pct = (n: number) => (totalObs === 0 ? 0 : Math.round((10_000 * n) / totalObs) / 100);

    console.log('\n=== Enrichment canonical contract verification ===\n');
    console.log(`Sample: ${rows.length} profiles with evaluationRaw (limit=${limit}), ${totalObs} field observations.\n`);

    console.log('| Metric | Raw JSON in DB | After backend shim (sanitize) |');
    console.log('|--------|----------------|--------------------------------|');
    console.log(
      `| Exact/spacing canonical | ${pct(counts.raw.canonical_stored)}% | ${pct(counts.after.canonical_stored)}% |`,
    );
    console.log(
      `| Phrase-style stored (legacy repairable) | ${pct(counts.raw.phrase_stored)}% | ${pct(counts.after.phrase_stored)}% |`,
    );
    console.log(`| Null / rejected | ${pct(counts.raw.null)}% | ${pct(counts.after.null)}% |`);

    console.log('\n--- Persistence / recency ---\n');
    console.log(
      `Profiles (in sample) with evaluatedAt in last ${recentDays}d AND phrase-shaped raw string (spaces/caps): ${recentWithPhraseShapedRaw}`,
    );
    console.log(
      `Raw field values that are non-empty garbage (coerce → null, not legacy phrase): ${garbageRawFields}`,
    );
    if (garbageRawFields > 0) {
      console.log('Non-canonical raw (coerce → null), up to 10 samples per field:');
      console.log(JSON.stringify(garbageByField, null, 2));
    }

    console.log('\n--- 10 sample rows (raw → after shim) ---\n');
    for (const s of samples) {
      console.log(
        JSON.stringify(
          {
            id: s.id,
            evaluatedAt: s.evaluatedAt,
            repairedFields: s.repairedFields,
            raw: s.raw,
            after: s.after,
          },
          null,
          2,
        ),
      );
      console.log('---');
    }

    console.log('\n--- DecisionEngine (UI) ---\n');
    console.log(
      'runDecisionEngineV1 applies mapFinalRuleEnrichmentSignals() first: only exact snake_case keys pass; human phrases become null. Backend getById() applies sanitizeEnrichmentSignalsV1 so API payloads are canonical or null before the client maps again.',
    );
    console.log('Run: cd ../dating-ui && node --test src/lib/decision-engine-v1.test.ts src/lib/final-rule-signal-mapper.test.ts\n');

    const shimOk = counts.after.phrase_stored === 0;
    const recentPhraseOk = recentWithPhraseShapedRaw === 0;
    const persistenceOk = recentPhraseOk && garbageRawFields === 0;
    console.log('--- Verdict ---\n');
    console.log(`After-shim phrase-shaped count: ${counts.after.phrase_stored} (expect 0) → ${shimOk ? 'PASS' : 'FAIL'}`);
    console.log(
      `Recent (${recentDays}d) profiles with phrase-shaped raw: ${recentWithPhraseShapedRaw} (expect 0 for clean pipeline) → ${recentPhraseOk ? 'PASS' : 'FAIL'}`,
    );
    console.log(
      `Non-empty raw values that do not coerce (garbage): ${garbageRawFields} → ${garbageRawFields === 0 ? 'PASS' : 'WARN (pre-enforcement or manual JSON)'}`,
    );
    const final =
      shimOk && persistenceOk
        ? 'PASS'
        : shimOk && recentPhraseOk
          ? 'PASS_WITH_HISTORIC_GARBAGE'
          : shimOk
            ? 'PASS_SHIM_ONLY'
            : 'FAIL';
    console.log(`\nFINAL: ${final}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
