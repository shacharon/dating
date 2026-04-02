import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runDecisionEngineV1 } from '../src/lib/decision-engine-v1';
import type { EnrichmentSignalsLike } from '../src/lib/enrichment-display-v1';

type Outcome =
  | 'DEALBREAKER'
  | 'HARD_TENSION'
  | 'CORE_MATCH'
  | 'NICE_TO_HAVE'
  | 'SCORE_ONLY';
type Decision = 'STRONG_MATCH' | 'GOOD_MATCH' | 'WEAK_MATCH' | 'PASS';

type EngineOut = {
  dominantOutcomeType?: Outcome;
  dominantOutcomeCode?: string | null;
  decision: Decision;
  flags: string[];
};

const API = 'http://localhost:3001/api/v1';
const AUDIT_MD = join(process.cwd(), '..', 'dating-api', 'docs', 'match-audit-15.md');

function emptySignals(): EnrichmentSignalsLike {
  return {
    dailyRhythm: null,
    autonomyTogethernessDepth: null,
    kidsTimeline: null,
    conflictStyleDetail: null,
    interestsTop3: [],
  };
}

function norm(s: EnrichmentSignalsLike | null | undefined): EnrichmentSignalsLike {
  return {
    dailyRhythm: s?.dailyRhythm ?? null,
    autonomyTogethernessDepth: s?.autonomyTogethernessDepth ?? null,
    kidsTimeline: s?.kidsTimeline ?? null,
    conflictStyleDetail: s?.conflictStyleDetail ?? null,
    interestsTop3: Array.isArray(s?.interestsTop3) ? s.interestsTop3 : [],
  };
}

function normalizeRaw(value: string | null): string | null {
  if (!value) return null;
  const v = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  return v || null;
}

const legacyKidsMap: Record<string, string> = {
  childfree: 'childfree',
  wants_kids_soon: 'wants_kids_soon',
  wants_kids: 'wants_kids',
  open_timeline: 'open_timeline',
  already_has_kids: 'already_has_kids',
  'wants kids soon': 'wants_kids_soon',
  'wants kids': 'wants_kids',
  'wants a family': 'wants_kids',
  'open on kids timeline': 'open_timeline',
  'already has kids': 'already_has_kids',
};
const legacyConflictMap: Record<string, string> = {
  escalates_quickly: 'escalates_quickly',
  withdraws_shuts_down: 'withdraws_shuts_down',
  cooldown_then_talk: 'cooldown_then_talk',
  process_together: 'process_together',
  repair_direct: 'repair_direct',
  repair_over_blame: 'repair_over_blame',
  avoids_conflict: 'avoids_conflict',
  indirect_communication: 'indirect_communication',
  humor_deflect: 'humor_deflect',
  'repair over blame': 'repair_over_blame',
  'prefers direct repair': 'repair_direct',
  'direct repair': 'repair_direct',
  'avoids drama': 'avoids_conflict',
  'cool down then talk': 'cooldown_then_talk',
  'process together': 'process_together',
  'withdraws and shuts down': 'withdraws_shuts_down',
  'escalates quickly': 'escalates_quickly',
};
const legacyRhythmMap: Record<string, string> = {
  early_bird: 'early_bird',
  early_extreme: 'early_extreme',
  late: 'late',
  stable_nine_to_five: 'stable_nine_to_five',
  irregular: 'irregular',
  startup_grind: 'startup_grind',
  slow_mornings: 'slow_mornings',
  homebody: 'homebody',
  quiet_evenings: 'quiet_evenings',
  fast_paced: 'fast_paced',
  location_flexible: 'location_flexible',
  social_bursts_recharge: 'social_bursts_recharge',
  'social bursts and recharge': 'social_bursts_recharge',
  'slow mornings': 'slow_mornings',
  'stable nine-to-five': 'stable_nine_to_five',
  'startup grind schedule': 'startup_grind',
  'location-flexible rhythm': 'location_flexible',
  'homebody rhythm': 'homebody',
  'early bird': 'early_bird',
};
const legacyAutonomyMap: Record<string, string> = {
  independence_with_space: 'independence_with_space',
  values_alone_time: 'values_alone_time',
  interdependence: 'interdependence',
  closeness_individuality: 'closeness_individuality',
  quality_over_quantity: 'quality_over_quantity',
  enmeshment: 'enmeshment',
  'closeness without losing individuality': 'closeness_individuality',
  'independent together': 'interdependence',
  'values alone time': 'values_alone_time',
  'independence with space': 'independence_with_space',
  'quality over quantity': 'quality_over_quantity',
};

function legacyCanonicalize(s: EnrichmentSignalsLike | null | undefined): EnrichmentSignalsLike {
  const raw = s ?? emptySignals();
  const kids = normalizeRaw(raw.kidsTimeline);
  const conflict = normalizeRaw(raw.conflictStyleDetail);
  const rhythm = normalizeRaw(raw.dailyRhythm);
  const autonomy = normalizeRaw(raw.autonomyTogethernessDepth);
  return {
    kidsTimeline: kids ? legacyKidsMap[kids] ?? null : null,
    conflictStyleDetail: conflict ? legacyConflictMap[conflict] ?? null : null,
    dailyRhythm: rhythm ? legacyRhythmMap[rhythm] ?? null : null,
    autonomyTogethernessDepth: autonomy ? legacyAutonomyMap[autonomy] ?? null : null,
    interestsTop3: Array.isArray(raw.interestsTop3) ? raw.interestsTop3 : [],
  };
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
const legacyConflictHardPairs = new Set(['repair_direct|avoids_conflict']);
const legacyRhythmHardPairs = new Set([
  pairKey('early_bird', 'slow_mornings'),
  pairKey('early_bird', 'startup_grind'),
  pairKey('early_bird', 'social_bursts_recharge'),
  pairKey('stable_nine_to_five', 'startup_grind'),
]);

function runLegacyDecisionEngineV1(input: {
  compatibilityScore: number;
  enrichment: { profileA: EnrichmentSignalsLike | null | undefined; profileB: EnrichmentSignalsLike | null | undefined };
}): EngineOut {
  const out = runDecisionEngineV1({
    compatibilityScore: input.compatibilityScore,
    enrichment: {
      profileA: legacyCanonicalize(input.enrichment.profileA),
      profileB: legacyCanonicalize(input.enrichment.profileB),
    },
  });
  const a = norm(legacyCanonicalize(input.enrichment.profileA));
  const b = norm(legacyCanonicalize(input.enrichment.profileB));
  const hasLegacyConflictPair =
    Boolean(a.conflictStyleDetail && b.conflictStyleDetail) &&
    legacyConflictHardPairs.has(pairKey(a.conflictStyleDetail!, b.conflictStyleDetail!));
  const hasLegacyRhythmPair =
    Boolean(a.dailyRhythm && b.dailyRhythm) &&
    legacyRhythmHardPairs.has(pairKey(a.dailyRhythm!, b.dailyRhythm!));

  if (!hasLegacyConflictPair && !hasLegacyRhythmPair) return out;
  const flags = new Set(out.flags);
  if (hasLegacyConflictPair) flags.add('CONFLICT_STYLE_MISMATCH');
  if (hasLegacyRhythmPair) flags.add('RHYTHM_MISMATCH');
  // Keep engine deterministic while reflecting legacy hard-pair behavior in type bucket.
  const dominantOutcomeType: Outcome =
    out.dominantOutcomeType === 'DEALBREAKER'
      ? 'DEALBREAKER'
      : flags.has('CONFLICT_STYLE_MISMATCH') || flags.has('RHYTHM_MISMATCH')
        ? 'HARD_TENSION'
        : (out.dominantOutcomeType ?? 'SCORE_ONLY');
  return {
    ...out,
    dominantOutcomeType,
    flags: [...flags],
  };
}

function inc(map: Map<string, number>, k: string): void {
  map.set(k, (map.get(k) ?? 0) + 1);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} at ${url}`);
  return (await r.json()) as T;
}

function parseSelectedProfileIds(md: string): string[] {
  const ids: string[] = [];
  const lines = md.split(/\r?\n/);
  let inTable = false;
  for (const line of lines) {
    if (line.startsWith('| profileId |')) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.startsWith('| ')) break;
    const cells = line.split('|').map((x) => x.trim()).filter(Boolean);
    if (cells.length >= 2 && cells[0] !== '---') ids.push(cells[0]!);
  }
  return ids;
}

function formatPct(n: number, d: number): string {
  if (d === 0) return '0.0%';
  return `${((n / d) * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const md = await readFile(AUDIT_MD, 'utf8');
  const ids = parseSelectedProfileIds(md);
  if (ids.length < 2) throw new Error('Could not parse selected profile IDs from match-audit-15.md');

  const profiles = new Map<string, { name: string; signals: EnrichmentSignalsLike | null }>();
  for (const id of ids) {
    const data = await fetchJson<any>(`${API}/profiles/${encodeURIComponent(id)}`);
    const profile = data?.profile;
    profiles.set(id, {
      name: profile?.name ?? id,
      signals: profile?.evaluation?.enrichment?.signals ?? null,
    });
  }

  const beforeOutcome = new Map<string, number>();
  const afterOutcome = new Map<string, number>();
  const beforeDecision = new Map<string, number>();
  const afterDecision = new Map<string, number>();
  const changed: Array<{
    pair: string;
    score: number;
    beforeType?: string;
    afterType?: string;
    beforeDecision: string;
    afterDecision: string;
    beforeFlags: string[];
    afterFlags: string[];
  }> = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const aId = ids[i]!;
      const bId = ids[j]!;
      const cmp = await fetchJson<any>(`${API}/matches/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aId, bId }),
      });
      if (cmp?.status === 'NOT_ANALYZED') continue;
      const match = cmp?.match ?? {};
      const score = Number(match.finalScore ?? match.overall ?? 0);
      const a = profiles.get(aId)!;
      const b = profiles.get(bId)!;
      const before = runLegacyDecisionEngineV1({
        compatibilityScore: score,
        enrichment: { profileA: a.signals, profileB: b.signals },
      });
      const after = runDecisionEngineV1({
        compatibilityScore: score,
        enrichment: { profileA: a.signals, profileB: b.signals },
      });
      inc(beforeOutcome, before.dominantOutcomeType ?? 'SCORE_ONLY');
      inc(afterOutcome, after.dominantOutcomeType ?? 'SCORE_ONLY');
      inc(beforeDecision, before.decision);
      inc(afterDecision, after.decision);

      const changedType = (before.dominantOutcomeType ?? 'SCORE_ONLY') !== (after.dominantOutcomeType ?? 'SCORE_ONLY');
      const changedDecision = before.decision !== after.decision;
      const changedFlags = before.flags.join('|') !== after.flags.join('|');
      if (changedType || changedDecision || changedFlags) {
        changed.push({
          pair: `${a.name} (${aId}) <> ${b.name} (${bId})`,
          score,
          beforeType: before.dominantOutcomeType ?? 'SCORE_ONLY',
          afterType: after.dominantOutcomeType ?? 'SCORE_ONLY',
          beforeDecision: before.decision,
          afterDecision: after.decision,
          beforeFlags: before.flags,
          afterFlags: after.flags,
        });
      }
    }
  }

  const total = [...afterOutcome.values()].reduce((a, b) => a + b, 0);
  const get = (m: Map<string, number>, k: string) => m.get(k) ?? 0;
  const beforeScoreOnly = get(beforeOutcome, 'SCORE_ONLY');
  const afterScoreOnly = get(afterOutcome, 'SCORE_ONLY');

  console.log(`Corpus pairs evaluated: ${total}`);
  console.log('');
  console.log('== BEFORE (legacy mapping path) ==');
  console.log('DominantOutcomeType:', Object.fromEntries(beforeOutcome.entries()));
  console.log('Decision:', Object.fromEntries(beforeDecision.entries()));
  console.log('');
  console.log('== AFTER (closed-label mapping path) ==');
  console.log('DominantOutcomeType:', Object.fromEntries(afterOutcome.entries()));
  console.log('Decision:', Object.fromEntries(afterDecision.entries()));
  console.log('');
  console.log('== SCORE_ONLY share ==');
  console.log(
    `Before: ${beforeScoreOnly}/${total} (${formatPct(beforeScoreOnly, total)}), After: ${afterScoreOnly}/${total} (${formatPct(afterScoreOnly, total)})`,
  );
  console.log('');
  console.log('== Changed examples (max 20) ==');
  changed
    .sort((a, b) => a.pair.localeCompare(b.pair))
    .slice(0, 20)
    .forEach((c, idx) => {
      console.log(
        `${idx + 1}. ${c.pair} | score=${c.score} | ${c.beforeType}/${c.beforeDecision} -> ${c.afterType}/${c.afterDecision} | beforeFlags=[${c.beforeFlags.join(',')}] afterFlags=[${c.afterFlags.join(',')}]`,
      );
    });
  if (changed.length === 0) console.log('(No changed pairs)');
  console.log('');
  console.log(`Total changed pairs: ${changed.length}/${total} (${formatPct(changed.length, total)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
