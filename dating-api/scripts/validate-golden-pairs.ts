/**
 * Golden-set validation: compare current match scores to a fixed manual benchmark.
 * Loads data/golden-pairs.json, checks each pair exists, reads match result,
 * compares finalScore to expectedFinalMin/Max, writes docs/golden-pairs.md.
 *
 * Run: npm run validate:golden-pairs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveEngineFinalScore } from '../src/matches/match-score.util';

const ROOT = process.cwd();
const GOLDEN_PAIRS_PATH = join(ROOT, 'data', 'golden-pairs.json');
const PROFILES_DIR = process.env.PROFILES_DATA_DIR?.trim() || join(ROOT, 'data', 'profiles');
const MATCHES_DIR = process.env.MATCHES_DATA_DIR?.trim() || join(ROOT, 'data', 'matches');
const REPORT_PATH = join(ROOT, 'docs', 'golden-pairs.md');

type GoldenJudgment = 'PLAUSIBLE' | 'SLIGHTLY_INFLATED' | 'CLEARLY_INFLATED' | 'BROKEN';
type ResultStatus = 'PASS' | 'FAIL' | 'MISSING_PROFILE' | 'MISSING_MATCH';

interface GoldenPair {
  profileAId: string;
  profileBId: string;
  profileALabel: string;
  profileBLabel: string;
  expectedJudgment: GoldenJudgment;
  expectedFinalMin: number;
  expectedFinalMax: number;
  notes: string;
}

interface MatchRecord {
  matchId?: string;
  aToB?: number;
  bToA?: number;
  relationshipStyle?: number;
  coverage?: number;
  coveragePercent?: number;
  friction?: number;
  compatibility?: number;
  finalScore?: number;
}

interface ValidationRow {
  index: number;
  pairLabel: string;
  profileAId: string;
  profileBId: string;
  expectedJudgment: GoldenJudgment;
  expectedFinalMin: number;
  expectedFinalMax: number;
  status: ResultStatus;
  aToB?: number;
  bToA?: number;
  relationship?: number;
  coverage?: number;
  friction?: number;
  compatibility?: number;
  finalScore?: number;
  miss?: number;
}

function toMatchId(aId: string, bId: string): string {
  const [minId, maxId] = [aId, bId].sort((x, y) => x.localeCompare(y));
  return `${minId}__${maxId}`;
}

function sanitizeMatchId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function loadProfileIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let entries: string[];
  try {
    entries = await readdir(PROFILES_DIR);
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') return ids;
    throw err;
  }
  const jsonFiles = entries.filter((f) => f.endsWith('.json') && !f.endsWith('.json.tmp'));
  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(PROFILES_DIR, file), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && 'id' in parsed && typeof (parsed as { id: string }).id === 'string') {
        ids.add((parsed as { id: string }).id);
      }
    } catch {
      // skip
    }
  }
  return ids;
}

async function loadMatch(matchId: string): Promise<MatchRecord | null> {
  const safeId = sanitizeMatchId(matchId);
  if (!safeId) return null;
  const filePath = join(MATCHES_DIR, `${safeId}.json`);
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as MatchRecord;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const rawGolden = await readFile(GOLDEN_PAIRS_PATH, 'utf8');
  const golden: GoldenPair[] = JSON.parse(rawGolden) as GoldenPair[];
  const profileIds = await loadProfileIds();

  const rows: ValidationRow[] = [];
  const misses: { index: number; pairLabel: string; miss: number; finalScore: number; expectedMid: number }[] = [];

  for (let i = 0; i < golden.length; i++) {
    const g = golden[i];
    const pairLabel = `${g.profileALabel} (#${g.profileAId}) ↔ ${g.profileBLabel} (#${g.profileBId})`;
    const hasA = profileIds.has(g.profileAId);
    const hasB = profileIds.has(g.profileBId);

    if (!hasA || !hasB) {
      rows.push({
        index: i + 1,
        pairLabel,
        profileAId: g.profileAId,
        profileBId: g.profileBId,
        expectedJudgment: g.expectedJudgment,
        expectedFinalMin: g.expectedFinalMin,
        expectedFinalMax: g.expectedFinalMax,
        status: 'MISSING_PROFILE',
      });
      continue;
    }

    const matchId = toMatchId(g.profileAId, g.profileBId);
    const match = await loadMatch(matchId);

    if (!match) {
      rows.push({
        index: i + 1,
        pairLabel,
        profileAId: g.profileAId,
        profileBId: g.profileBId,
        expectedJudgment: g.expectedJudgment,
        expectedFinalMin: g.expectedFinalMin,
        expectedFinalMax: g.expectedFinalMax,
        status: 'MISSING_MATCH',
      });
      continue;
    }

    const finalScore = resolveEngineFinalScore(match);
    const coverage = match.coveragePercent ?? match.coverage;
    const inRange = finalScore >= g.expectedFinalMin && finalScore <= g.expectedFinalMax;
    const status: ResultStatus = inRange ? 'PASS' : 'FAIL';
    const expectedMid = (g.expectedFinalMin + g.expectedFinalMax) / 2;
    const miss = Math.abs(finalScore - expectedMid);

    rows.push({
      index: i + 1,
      pairLabel,
      profileAId: g.profileAId,
      profileBId: g.profileBId,
      expectedJudgment: g.expectedJudgment,
      expectedFinalMin: g.expectedFinalMin,
      expectedFinalMax: g.expectedFinalMax,
      status,
      aToB: match.aToB,
      bToA: match.bToA,
      relationship: match.relationshipStyle,
      coverage,
      friction: match.friction,
      compatibility: match.compatibility,
      finalScore,
      miss: inRange ? undefined : miss,
    });

    if (!inRange) {
      misses.push({ index: i + 1, pairLabel, miss, finalScore, expectedMid });
    }
  }

  const passCount = rows.filter((r) => r.status === 'PASS').length;
  const failCount = rows.filter((r) => r.status === 'FAIL').length;
  const missingProfileCount = rows.filter((r) => r.status === 'MISSING_PROFILE').length;
  const missingMatchCount = rows.filter((r) => r.status === 'MISSING_MATCH').length;
  const datasetFailures = missingProfileCount + missingMatchCount;
  const scoringFailures = failCount;

  misses.sort((a, b) => b.miss - a.miss);
  const top5Misses = misses.slice(0, 5);

  let recommendation: 'DATASET_PROBLEM' | 'SCORING_PROBLEM' | 'GOOD_ENOUGH_FOR_NOW';
  if (datasetFailures > 0 && datasetFailures >= scoringFailures) {
    recommendation = 'DATASET_PROBLEM';
  } else if (scoringFailures > 0 && scoringFailures > datasetFailures) {
    recommendation = 'SCORING_PROBLEM';
  } else {
    recommendation = 'GOOD_ENOUGH_FOR_NOW';
  }

  const report = [
    '# Golden pairs validation report',
    '',
    'Generated by `npm run validate:golden-pairs`. Compares current match scores to a fixed manual benchmark.',
    '',
    '---',
    '',
    '## 1. Dataset source used',
    '',
    `- **Profiles:** \`${PROFILES_DIR}\` (PROFILES_DATA_DIR or default data/profiles).`,
    `- **Matches:** \`${MATCHES_DIR}\` (MATCHES_DATA_DIR or default data/matches).`,
    `- **Golden set:** \`data/golden-pairs.json\` (${golden.length} pairs).`,
    '',
    '---',
    '',
    '## 2. Total pairs',
    '',
    `**${golden.length}** pairs in the golden set.`,
    '',
    '---',
    '',
    '## 3. Pass / fail summary',
    '',
    '| Status | Count |',
    '|--------|-------|',
    `| PASS | ${passCount} |`,
    `| FAIL (score outside expected band) | ${failCount} |`,
    `| MISSING_PROFILE | ${missingProfileCount} |`,
    `| MISSING_MATCH | ${missingMatchCount} |`,
    '',
    '---',
    '',
    '## 4. All pairs',
    '',
    '| # | Pair | Expected judgment | Expected final | Status | A→B | B→A | Rel | Cov% | Fric | Compat | finalScore |',
    '|---|------|-------------------|----------------|--------|-----|-----|-----|------|------|--------|------------|',
    ...rows.map((r) => {
      const expectedFinal = `${r.expectedFinalMin}–${r.expectedFinalMax}`;
      const aToB = r.aToB != null ? String(r.aToB) : '—';
      const bToA = r.bToA != null ? String(r.bToA) : '—';
      const rel = r.relationship != null ? String(r.relationship) : '—';
      const cov = r.coverage != null ? String(r.coverage) : '—';
      const fric = r.friction != null ? String(r.friction) : '—';
      const compat = r.compatibility != null ? String(r.compatibility) : '—';
      const final = r.finalScore != null ? String(r.finalScore) : '—';
      return `| ${r.index} | ${r.pairLabel} | ${r.expectedJudgment} | ${expectedFinal} | **${r.status}** | ${aToB} | ${bToA} | ${rel} | ${cov} | ${fric} | ${compat} | ${final} |`;
    }),
    '',
    '---',
    '',
    '## 5. Failures: dataset vs scoring',
    '',
    '- **Dataset failures** (cannot evaluate): MISSING_PROFILE or MISSING_MATCH → fix dataset or run recompute so these pairs exist.',
    `  - Count: **${datasetFailures}** (${missingProfileCount} missing profile(s), ${missingMatchCount} missing match(es)).`,
    '- **Scoring failures** (evaluated but finalScore outside expected band): FAIL → tune scoring or adjust expected band.',
    `  - Count: **${scoringFailures}**.`,
    '',
    '---',
    '',
    '## 6. Top 5 biggest misses',
    '',
    'Pairs with largest |finalScore − expectedMid| among FAILs.',
    '',
    '| # | Pair | finalScore | Expected mid | Miss |',
    '|---|------|------------|--------------|------|',
    ...(top5Misses.length
      ? top5Misses.map((m) => `| ${m.index} | ${m.pairLabel} | ${m.finalScore} | ${m.expectedMid} | ${m.miss.toFixed(0)} |`)
      : ['| — | — | — | — | No FAILs. |']),
    '',
    '---',
    '',
    '## 7. Recommendation',
    '',
    `**${recommendation}**`,
    '',
    recommendation === 'DATASET_PROBLEM'
      ? '- One or more golden pairs are missing from the active dataset (profile or match file). Add/import profiles and run `npm run recompute-matches` so all golden pairs can be evaluated before tuning scoring.'
      : recommendation === 'SCORING_PROBLEM'
        ? '- One or more pairs scored outside the expected band. Consider one more calibration pass or adjust expected bands in `data/golden-pairs.json` if human judgment has shifted.'
        : '- Pass rate is acceptable; no dominant dataset or scoring failures. Safe to stop broad tuning and use this golden set for future regressions.',
    '',
  ].join('\n');

  await writeFile(REPORT_PATH, report, 'utf8');
  console.log(`Golden pairs validation done. Report written to ${REPORT_PATH}`);
  console.log(`PASS: ${passCount}, FAIL: ${failCount}, MISSING_PROFILE: ${missingProfileCount}, MISSING_MATCH: ${missingMatchCount}`);
  console.log(`Recommendation: ${recommendation}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
