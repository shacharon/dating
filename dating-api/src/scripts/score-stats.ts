/**
 * CLI script: print percentile stats (p50/p75/p90/p95/p99/max) and bin distribution
 * for match scores, before and after applying SCORE_STRETCH.
 * Uses existing match JSON files in data/matches (e.g. 7260 matches).
 *
 * Run: npm run score-stats
 * Optional: SCORE_STRETCH=1.2 npm run score-stats
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MatchRecordDto } from '../matches/match.types';

const MATCHES_DIR = process.env.MATCHES_DATA_DIR?.trim() || join(process.cwd(), 'data', 'matches');

function clamp01_100(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)));
}

function getScoreStretch(): number {
  const raw = process.env.SCORE_STRETCH;
  if (raw == null || raw === '') return 1;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.1, Math.min(2, n));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function binDistribution(scores: number[], binSize: number = 10): Map<string, number> {
  const bins = new Map<string, number>();
  for (let low = 0; low < 100; low += binSize) {
    const high = low === 90 ? 100 : low + binSize - 1;
    bins.set(`${low}-${high}`, 0);
  }
  for (const s of scores) {
    const bucket = Math.min(90, Math.floor(s / binSize) * binSize);
    const high = bucket === 90 ? 100 : bucket + binSize - 1;
    const key = `${bucket}-${high}`;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  return bins;
}

function printPercentiles(label: string, sorted: number[]): void {
  if (sorted.length === 0) {
    console.log(`${label}: (no data)`);
    return;
  }
  console.log(`${label}:`);
  console.log(
    `  p50=${percentile(sorted, 50).toFixed(2)} p75=${percentile(sorted, 75).toFixed(2)} p90=${percentile(sorted, 90).toFixed(2)} p95=${percentile(sorted, 95).toFixed(2)} p99=${percentile(sorted, 99).toFixed(2)} max=${sorted[sorted.length - 1].toFixed(2)}`,
  );
}

function printBins(label: string, bins: Map<string, number>, total: number): void {
  console.log(`${label}:`);
  const entries = [...bins.entries()].sort(
    (a, b) => parseInt(a[0], 10) - parseInt(b[0], 10),
  );
  for (const [range, count] of entries) {
    const pct = total > 0 ? ((100 * count) / total).toFixed(1) : '0';
    const barLen = total > 0 ? Math.round((count / total) * 40) : 0;
    const bar = '█'.repeat(barLen) + '░'.repeat(40 - barLen);
    console.log(`  ${range.padStart(5)}: ${String(count).padStart(5)} (${pct.padStart(5)}%) ${bar}`);
  }
}

async function main(): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(MATCHES_DIR);
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') {
      console.error(`Matches directory not found: ${MATCHES_DIR}`);
      process.exit(1);
    }
    throw err;
  }

  const jsonFiles = entries.filter(
    (f) => f.endsWith('.json') && !f.endsWith('.json.tmp') && f !== 'index.json',
  );

  const rawScores: number[] = [];
  const finalScores: number[] = [];

  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(MATCHES_DIR, file), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || !('matchId' in parsed)) continue;

      const r = parsed as MatchRecordDto;
      const compat = r.compatibility ?? 0;
      const covFactor = r.coverageFactor ?? 1;
      const fricPen = r.frictionPenalty ?? 0;
      const rawScoreValue = r.rawScore ?? compat * covFactor - fricPen;
      const finalScoreValue = r.finalScore ?? r.overall ?? 0;

      rawScores.push(rawScoreValue);
      finalScores.push(finalScoreValue);
    } catch {
      // skip invalid
    }
  }

  const scoreStretch = getScoreStretch();
  const afterStretch = rawScores.map((raw) => clamp01_100(raw * scoreStretch));

  const n = rawScores.length;
  console.log('');
  console.log(`Matches loaded: ${n}`);
  console.log(`SCORE_STRETCH: ${scoreStretch}`);
  console.log('');

  const rawSorted = [...rawScores].sort((a, b) => a - b);
  const finalSorted = [...finalScores].sort((a, b) => a - b);
  const afterSorted = [...afterStretch].sort((a, b) => a - b);

  printPercentiles('rawScore (before clamp)', rawSorted);
  console.log('');
  printPercentiles('finalScore (before stretch)', finalSorted);
  console.log('');
  printPercentiles(`finalScore (after stretch, SCORE_STRETCH=${scoreStretch})`, afterSorted);
  console.log('');

  console.log('Bin distribution (finalScore, before stretch):');
  printBins('  bins', binDistribution(finalScores), n);
  console.log('');
  console.log(`Bin distribution (finalScore, after stretch, SCORE_STRETCH=${scoreStretch}):`);
  printBins('  bins', binDistribution(afterStretch), n);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
