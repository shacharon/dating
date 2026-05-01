/**
 * Top 20 + seeded random 20 matches: re-run compare to get explainability + recommendation.
 * Stored match JSON may omit explainability; this uses live engine output on real profile pairs.
 *
 * Run (from dating-api root):
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/sample-recommendation-review.ts
 *
 * Env: PROFILES_DATA_DIR, MATCHES_DATA_DIR (defaults data/profiles, data/matches)
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProfileJsonPayload } from '../src/profiles/profiles-json.service';
import type { MatchRecordDto } from '../src/matches/match.types';
import { compareWithStatus } from '../src/matches/match-engine';
import type { CompareResultDto } from '../src/matches/match-engine';

const ROOT = process.cwd();
const PROFILES_DIR = process.env.PROFILES_DATA_DIR?.trim() || join(ROOT, 'data', 'profiles');
const MATCHES_DIR = process.env.MATCHES_DATA_DIR?.trim() || join(ROOT, 'data', 'matches');
const OUT = join(ROOT, 'data', 'reports', 'recommendation-sample-dump.json');
const SEED = 42;

function isRecord(x: unknown): x is MatchRecordDto {
  return (
    x != null &&
    typeof x === 'object' &&
    'matchId' in x &&
    'aId' in x &&
    'bId' in x &&
    'overall' in x
  );
}

function isProfile(x: unknown): x is ProfileJsonPayload {
  return (
    x != null &&
    typeof x === 'object' &&
    'id' in x &&
    'name' in x &&
    'texts' in x &&
    'evaluation' in x &&
    'savedAt' in x
  );
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function loadProfiles(): Promise<Map<string, ProfileJsonPayload>> {
  const entries = await readdir(PROFILES_DIR);
  const map = new Map<string, ProfileJsonPayload>();
  for (const f of entries.filter((x) => x.endsWith('.json') && !x.endsWith('.json.tmp'))) {
    try {
      const raw = await readFile(join(PROFILES_DIR, f), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (isProfile(parsed)) map.set(parsed.id, parsed);
    } catch {
      /* skip */
    }
  }
  return map;
}

async function loadMatchRecords(): Promise<MatchRecordDto[]> {
  const entries = await readdir(MATCHES_DIR);
  const files = entries.filter(
    (f) => f.endsWith('.json') && !f.endsWith('.json.tmp') && f !== 'index.json',
  );
  const out: MatchRecordDto[] = [];
  for (const f of files) {
    try {
      const raw = await readFile(join(MATCHES_DIR, f), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (isRecord(parsed)) out.push(parsed);
    } catch {
      /* skip */
    }
  }
  return out;
}

function isReady(
  r: ReturnType<typeof compareWithStatus>,
): r is CompareResultDto {
  return !('status' in r);
}

async function main(): Promise<void> {
  const [profiles, records] = await Promise.all([loadProfiles(), loadMatchRecords()]);
  const byScore = [...records].sort(
    (a, b) => (b.finalScore ?? b.overall) - (a.finalScore ?? a.overall),
  );
  const top20 = byScore.slice(0, 20);
  const rand = mulberry32(SEED);
  const pool = [...records];
  const random20: MatchRecordDto[] = [];
  for (let i = 0; i < 20 && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    random20.push(pool.splice(idx, 1)[0]!);
  }

  type Item = {
    sample: string;
    matchId: string;
    aId: string;
    bId: string;
    finalScore: number;
    friction: number;
    chips: string[];
    tensionChip: string | null;
    reasonShort: string;
    takeaway: string;
    caution: string | null;
    action: string;
    engineNote?: string;
  };

  const items: Item[] = [];

  function evaluate(rec: MatchRecordDto, tag: string): void {
    const pa = profiles.get(rec.aId);
    const pb = profiles.get(rec.bId);
    if (!pa || !pb) {
      items.push({
        sample: tag,
        matchId: rec.matchId,
        aId: rec.aId,
        bId: rec.bId,
        finalScore: rec.finalScore ?? rec.overall,
        friction: rec.friction ?? 0,
        chips: [],
        tensionChip: null,
        reasonShort: '',
        takeaway: '',
        caution: null,
        action: '',
        engineNote: 'missing_profile',
      });
      return;
    }
    const cmp = compareWithStatus(pa, pb);
    if (!isReady(cmp)) {
      items.push({
        sample: tag,
        matchId: rec.matchId,
        aId: rec.aId,
        bId: rec.bId,
        finalScore: rec.finalScore ?? rec.overall,
        friction: rec.friction ?? 0,
        chips: [],
        tensionChip: null,
        reasonShort: '',
        takeaway: '',
        caution: null,
        action: '',
        engineNote: cmp.status,
      });
      return;
    }
    const fs = cmp.finalScore;
    const fr = cmp.friction;
    const exp = cmp.explainability;
    const recOut = cmp.recommendation;
    items.push({
      sample: tag,
      matchId: rec.matchId,
      aId: rec.aId,
      bId: rec.bId,
      finalScore: fs,
      friction: fr,
      chips: exp.positiveChips,
      tensionChip: exp.tensionChip ?? null,
      reasonShort: exp.reasonShort,
      takeaway: recOut.primaryTakeaway,
      caution: recOut.caution ?? null,
      action: recOut.suggestedNextAction,
    });
  }

  for (const r of top20) evaluate(r, 'top');
  for (const r of random20) evaluate(r, 'random');

  const payload = {
    generatedAt: new Date().toISOString(),
    seed: SEED,
    profileCount: profiles.size,
    matchFileCount: records.length,
    count: items.length,
    items,
  };

  await mkdir(join(ROOT, 'data', 'reports'), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2), 'utf8');
  // eslint-disable-next-line no-console -- CLI
  console.log(`Wrote ${OUT} (${items.length} rows)`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console -- CLI
  console.error(e);
  process.exit(1);
});
