/**
 * Audit why pairs land SCORE_ONLY in DecisionEngineV1.
 * Samples random profile pairs from API, classifies primary cause per SCORE_ONLY row.
 *
 * Run: npx tsx scripts/audit-score-only-causes.ts
 * Needs: dating-api with profiles + compare. Optional: NEXT_PUBLIC_API_URL (origin only, no /api path).
 */

import { mapFinalRuleEnrichmentSignals } from '../src/lib/final-rule-signal-mapper';
import { runDecisionEngineV1 } from '../src/lib/decision-engine-v1';
import type { EnrichmentSignalsLike } from '../src/lib/enrichment-display-v1';

const API = (() => {
  const origin = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  return origin ? `${origin}/api/v1` : 'http://127.0.0.1:3001/api/v1';
})();
const SAMPLE_PAIRS = 50;

type Cause = 'missing_signals' | 'mapping_gap' | 'rule_gap' | 'threshold_block';

function normRaw(s: EnrichmentSignalsLike | null | undefined): EnrichmentSignalsLike {
  return {
    dailyRhythm: s?.dailyRhythm ?? null,
    autonomyTogethernessDepth: s?.autonomyTogethernessDepth ?? null,
    kidsTimeline: s?.kidsTimeline ?? null,
    conflictStyleDetail: s?.conflictStyleDetail ?? null,
    interestsTop3: Array.isArray(s?.interestsTop3) ? s.interestsTop3 : [],
  };
}

function kidsAligned(ka: string | null, kb: string | null): boolean {
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const family = new Set(['wants_kids_soon', 'wants_kids', 'open_timeline', 'already_has_kids']);
  if (ka === 'childfree' || kb === 'childfree') return false;
  return family.has(ka) && family.has(kb);
}

function conflictAligned(ca: string | null, cb: string | null): boolean {
  return Boolean(ca && cb && ca === cb);
}

function rhythmAligned(ra: string | null, rb: string | null): boolean {
  return Boolean(ra && rb && ra === rb);
}

function autonomyAligned(aa: string | null, ab: string | null): boolean {
  return Boolean(aa && ab && aa === ab);
}

function sharedNamedInterest(ia: string[], ib: string[]): boolean {
  const sa = new Set(ia.map((x) => String(x).trim().toLowerCase()).filter(Boolean));
  for (const x of ib) {
    const t = String(x).trim().toLowerCase();
    if (t && sa.has(t)) return true;
  }
  return false;
}

function scoreTierIndex(score: number): number {
  const s = Number.isFinite(score) ? score : 0;
  if (s >= 76) return 3;
  if (s >= 60) return 2;
  if (s >= 42) return 1;
  return 0;
}

function coreRawPresent(s: EnrichmentSignalsLike): boolean {
  return Boolean(
    s.kidsTimeline ||
      s.conflictStyleDetail ||
      s.dailyRhythm ||
      s.autonomyTogethernessDepth,
  );
}

function mappingLostRaw(raw: EnrichmentSignalsLike, mapped: EnrichmentSignalsLike): string[] {
  const lost: string[] = [];
  const fields: (keyof Pick<
    EnrichmentSignalsLike,
    'kidsTimeline' | 'conflictStyleDetail' | 'dailyRhythm' | 'autonomyTogethernessDepth'
  >)[] = ['kidsTimeline', 'conflictStyleDetail', 'dailyRhythm', 'autonomyTogethernessDepth'];
  for (const f of fields) {
    const r = raw[f];
    if (r != null && String(r).trim() !== '' && mapped[f] == null) lost.push(f);
  }
  return lost;
}

function classifyScoreOnly(args: {
  rawA: EnrichmentSignalsLike;
  rawB: EnrichmentSignalsLike;
  mappedA: EnrichmentSignalsLike;
  mappedB: EnrichmentSignalsLike;
  scoreTier: number;
}): { cause: Cause; explain: string } {
  const { rawA, rawB, mappedA, mappedB, scoreTier } = args;

  const lostA = mappingLostRaw(rawA, mappedA);
  const lostB = mappingLostRaw(rawB, mappedB);
  const anyMappingGap = lostA.length > 0 || lostB.length > 0;

  const wouldBoost =
    kidsAligned(mappedA.kidsTimeline, mappedB.kidsTimeline) ||
    conflictAligned(mappedA.conflictStyleDetail, mappedB.conflictStyleDetail) ||
    rhythmAligned(mappedA.dailyRhythm, mappedB.dailyRhythm) ||
    autonomyAligned(mappedA.autonomyTogethernessDepth, mappedB.autonomyTogethernessDepth);

  const wouldNice = sharedNamedInterest(mappedA.interestsTop3, mappedB.interestsTop3);

  if (scoreTier >= 3 && wouldBoost && !wouldNice) {
    return {
      cause: 'threshold_block',
      explain:
        `Baseline score tier is ${scoreTier} (≥76); CORE_MATCH flags are gated by tier<3, so aligned enrichment never surfaces as a dominant flag.`,
    };
  }

  if (anyMappingGap) {
    return {
      cause: 'mapping_gap',
      explain: `Raw values dropped by closed-label map (not exact canonical keys): A[${lostA.join(',') || '—'}] B[${lostB.join(',') || '—'}].`,
    };
  }

  const bothMappedEmptyCore =
    !mappedA.kidsTimeline &&
    !mappedA.conflictStyleDetail &&
    !mappedA.dailyRhythm &&
    !mappedA.autonomyTogethernessDepth &&
    !mappedB.kidsTimeline &&
    !mappedB.conflictStyleDetail &&
    !mappedB.dailyRhythm &&
    !mappedB.autonomyTogethernessDepth;

  if (bothMappedEmptyCore && !wouldNice) {
    const rawHadSomething = coreRawPresent(rawA) || coreRawPresent(rawB);
    if (rawHadSomething) {
      return {
        cause: 'mapping_gap',
        explain:
          'Raw had core field strings but all mapped to null (values are not exact closed-label keys).',
      };
    }
    return {
      cause: 'missing_signals',
      explain:
        'All four core enrichment fields empty on both sides after mapping; no SHARED_INTEREST overlap.',
    };
  }

  return {
    cause: 'rule_gap',
    explain:
      'Mapped labels exist but no rule fires: not identical for ALIGN, not in severe conflict / early-vs-late rhythm / autonomy-gap patterns, and no shared interest token match.',
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function main(): Promise<void> {
  const listRes = await fetchJson<{ ok?: boolean; items?: { id: string; name: string }[] }>(
    `${API}/profiles`,
  );
  const items = listRes.items ?? [];
  if (items.length < 2) {
    console.error('Need at least 2 profiles from GET /profiles');
    process.exit(1);
  }

  const ids = items.map((x) => x.id);
  const idToName = new Map(items.map((x) => [x.id, x.name]));

  const pairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i]!, ids[j]!]);
    }
  }

  const rng = () => Math.random();
  const picked = shuffle(pairs, rng).slice(0, SAMPLE_PAIRS);

  const causeCounts = new Map<Cause, number>([
    ['missing_signals', 0],
    ['mapping_gap', 0],
    ['rule_gap', 0],
    ['threshold_block', 0],
  ]);

  const scoreOnlyExamples: Array<{
    pair: string;
    score: number;
    rawA: EnrichmentSignalsLike;
    rawB: EnrichmentSignalsLike;
    mappedA: EnrichmentSignalsLike;
    mappedB: EnrichmentSignalsLike;
    flags: string[];
    cause: Cause;
    explain: string;
  }> = [];

  let scoreOnlyTotal = 0;

  for (const [aId, bId] of picked) {
    const cmp = await fetchJson<{
      status?: string;
      match?: { finalScore?: number };
    }>(`${API}/matches/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aId, bId }),
    });

    if (cmp.status === 'NOT_ANALYZED') continue;

    const score = Number(cmp.match?.finalScore ?? 0);
    const [da, db] = await Promise.all([
      fetchJson<{ profile?: { evaluation?: { enrichment?: { signals?: EnrichmentSignalsLike } } } }>(
        `${API}/profiles/${encodeURIComponent(aId)}`,
      ),
      fetchJson<{ profile?: { evaluation?: { enrichment?: { signals?: EnrichmentSignalsLike } } } }>(
        `${API}/profiles/${encodeURIComponent(bId)}`,
      ),
    ]);

    const rawA = normRaw(da.profile?.evaluation?.enrichment?.signals ?? null);
    const rawB = normRaw(db.profile?.evaluation?.enrichment?.signals ?? null);
    const mappedA = mapFinalRuleEnrichmentSignals(rawA);
    const mappedB = mapFinalRuleEnrichmentSignals(rawB);

    const out = runDecisionEngineV1({
      compatibilityScore: score,
      enrichment: { profileA: rawA, profileB: rawB },
    });

    const dom = out.dominantOutcomeType ?? 'SCORE_ONLY';
    if (dom !== 'SCORE_ONLY') continue;

    scoreOnlyTotal++;
    const scoreTier = scoreTierIndex(score);
    const { cause, explain } = classifyScoreOnly({
      rawA,
      rawB,
      mappedA,
      mappedB,
      scoreTier,
    });
    causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1);

    const label = `${idToName.get(aId) ?? aId} <> ${idToName.get(bId) ?? bId}`;
    scoreOnlyExamples.push({
      pair: label,
      score,
      rawA,
      rawB,
      mappedA,
      mappedB,
      flags: out.flags,
      cause,
      explain,
    });
  }

  const denom = scoreOnlyTotal || 1;
  const pct = (n: number) => `${((n / denom) * 100).toFixed(1)}%`;

  const sortedCauses = [...causeCounts.entries()].sort((a, b) => b[1] - a[1]);

  console.log('=== SCORE_ONLY audit (50 random pairs) ===\n');
  console.log(`Pairs attempted: ${picked.length}`);
  console.log(`SCORE_ONLY among sample: ${scoreOnlyTotal}\n`);

  console.log('Aggregate (% of SCORE_ONLY rows):');
  for (const [c, n] of sortedCauses) {
    console.log(`  ${c}: ${n} (${pct(n)})`);
  }

  console.log('\n--- Top 5 root causes (by count) ---');
  sortedCauses.slice(0, 5).forEach(([c, n], i) => {
    console.log(`  ${i + 1}. ${c} — ${n} (${pct(n)})`);
  });

  console.log('\n--- 10 concrete SCORE_ONLY examples ---\n');
  scoreOnlyExamples.slice(0, 10).forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.pair} | score=${ex.score} | cause=${ex.cause}`);
    console.log(`   ${ex.explain}`);
    console.log(`   flags: [${ex.flags.join(', ') || 'none'}]`);
    console.log(
      `   raw A: kids=${JSON.stringify(ex.rawA.kidsTimeline)} conflict=${JSON.stringify(ex.rawA.conflictStyleDetail)} rhythm=${JSON.stringify(ex.rawA.dailyRhythm)} autonomy=${JSON.stringify(ex.rawA.autonomyTogethernessDepth)} interests=${JSON.stringify(ex.rawA.interestsTop3)}`,
    );
    console.log(
      `   raw B: kids=${JSON.stringify(ex.rawB.kidsTimeline)} conflict=${JSON.stringify(ex.rawB.conflictStyleDetail)} rhythm=${JSON.stringify(ex.rawB.dailyRhythm)} autonomy=${JSON.stringify(ex.rawB.autonomyTogethernessDepth)} interests=${JSON.stringify(ex.rawB.interestsTop3)}`,
    );
    console.log(
      `   mapped A: kids=${JSON.stringify(ex.mappedA.kidsTimeline)} conflict=${JSON.stringify(ex.mappedA.conflictStyleDetail)} rhythm=${JSON.stringify(ex.mappedA.dailyRhythm)} autonomy=${JSON.stringify(ex.mappedA.autonomyTogethernessDepth)}`,
    );
    console.log(
      `   mapped B: kids=${JSON.stringify(ex.mappedB.kidsTimeline)} conflict=${JSON.stringify(ex.mappedB.conflictStyleDetail)} rhythm=${JSON.stringify(ex.mappedB.dailyRhythm)} autonomy=${JSON.stringify(ex.mappedB.autonomyTogethernessDepth)}`,
    );
    console.log('');
  });

  const top = sortedCauses[0]?.[0];
  let verdict = 'mixed';
  if (top === 'missing_signals' || top === 'mapping_gap') {
    verdict =
      top === 'missing_signals'
        ? 'Primarily an extraction / enrichment coverage issue (signals not present in API payload).'
        : 'Primarily a mapping issue (non-canonical strings from extraction not admitted by closed-label map).';
  } else if (top === 'rule_gap') {
    verdict =
      'Primarily a decision/rules issue (labels exist but engine rules do not emit mismatch, alignment, or shared-interest flags).';
  } else if (top === 'threshold_block') {
    verdict =
      'Primarily a decision/rules issue: high score tier (≥76) suppresses CORE_MATCH flags via tier<3 gate, so enrichment never becomes dominant.';
  }

  console.log('--- Final verdict ---');
  console.log(verdict);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
