/**
 * Diagnostics script: load all computed matches and print summary stats.
 * Uses same data dir as recompute-matches (data/matches/*.json).
 *
 * Run: npm run match-diagnostics
 * Or:  cd src/find/dating/dating-api; npm run match-diagnostics
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MatchRecordDto } from '../src/matches/match.types';

const MATCHES_DIR =
  process.env.MATCHES_DATA_DIR?.trim() || join(process.cwd(), 'data', 'matches');

interface LoadedMatch {
  record: MatchRecordDto;
  finalScore: number;
  tier: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  dealbreakers: Array<{ code: string; severity: string }>;
}

function getTier(record: MatchRecordDto): 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN' {
  const t = record.balance?.tier ?? record.debug?.tier;
  if (t === 'GREEN' || t === 'YELLOW' || t === 'RED') return t;
  return 'UNKNOWN';
}

function getDealbreakers(record: MatchRecordDto): Array<{ code: string; severity: string }> {
  const list = record.dealbreakers ?? record.debug?.dealbreakers ?? [];
  return list.map((d) => ({ code: d.code, severity: d.severity }));
}

async function loadAllMatches(): Promise<LoadedMatch[]> {
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

  const matches: LoadedMatch[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(MATCHES_DIR, file), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && 'overall' in parsed) {
        const record = parsed as MatchRecordDto;
        const finalScore = record.finalScore ?? record.overall;
        matches.push({
          record,
          finalScore: typeof finalScore === 'number' ? finalScore : 0,
          tier: getTier(record),
          dealbreakers: getDealbreakers(record),
        });
      }
    } catch {
      // skip invalid JSON
    }
  }
  return matches;
}

async function main(): Promise<void> {
  console.log('Loading matches from', MATCHES_DIR, '...\n');
  const matches = await loadAllMatches();

  if (matches.length === 0) {
    console.log('No matches found. Run recompute-matches first.');
    process.exit(0);
  }

  // 1. total matches
  console.log('=== 1. Total matches ===');
  console.log(matches.length);
  console.log('');

  // 2. average finalScore
  const sumScore = matches.reduce((s, m) => s + m.finalScore, 0);
  const avgScore = sumScore / matches.length;
  console.log('=== 2. Average finalScore ===');
  console.log(avgScore.toFixed(2));
  console.log('');

  // 3. zero-score count
  const zeroCount = matches.filter((m) => m.finalScore === 0).length;
  console.log('=== 3. Zero-score count ===');
  console.log(zeroCount);
  console.log('');

  // 4. tier distribution
  const tierCounts = { GREEN: 0, YELLOW: 0, RED: 0, UNKNOWN: 0 };
  for (const m of matches) {
    tierCounts[m.tier]++;
  }
  console.log('=== 4. Tier distribution ===');
  console.log('  GREEN:  ', tierCounts.GREEN);
  console.log('  YELLOW: ', tierCounts.YELLOW);
  console.log('  RED:    ', tierCounts.RED);
  if (tierCounts.UNKNOWN > 0) console.log('  UNKNOWN:', tierCounts.UNKNOWN);
  console.log('');

  // 5. dealbreaker distribution
  const dbCounts: Record<string, number> = {};
  for (const m of matches) {
    for (const d of m.dealbreakers) {
      dbCounts[d.code] = (dbCounts[d.code] ?? 0) + 1;
    }
  }
  const dbEntries = Object.entries(dbCounts).sort((a, b) => b[1] - a[1]);
  console.log('=== 5. Dealbreaker distribution ===');
  for (const [code, count] of dbEntries) {
    const pct = ((count / matches.length) * 100).toFixed(1);
    console.log(`  ${code}: ${count} (${pct}%)`);
  }
  if (dbEntries.length === 0) console.log('  (none)');
  console.log('');

  // 6. top 20 matches
  const byScoreDesc = [...matches].sort((a, b) => b.finalScore - a.finalScore);
  const top20 = byScoreDesc.slice(0, 20);
  console.log('=== 6. Top 20 matches ===');
  for (const m of top20) {
    const names = `${m.record.a?.name ?? m.record.aId} / ${m.record.b?.name ?? m.record.bId}`;
    const dbCodes = m.dealbreakers.map((d) => d.code).join(', ') || '(none)';
    console.log(`  finalScore=${String(m.finalScore).padStart(3)} tier=${m.tier.padEnd(7)} ${names}`);
    console.log(`    dealbreakers: ${dbCodes}`);
  }
  console.log('');

  // 7. bottom 20 matches
  const byScoreAsc = [...matches].sort((a, b) => a.finalScore - b.finalScore);
  const bottom20 = byScoreAsc.slice(0, 20);
  console.log('=== 7. Bottom 20 matches ===');
  for (const m of bottom20) {
    const names = `${m.record.a?.name ?? m.record.aId} / ${m.record.b?.name ?? m.record.bId}`;
    const dbCodes = m.dealbreakers.map((d) => d.code).join(', ') || '(none)';
    console.log(`  finalScore=${String(m.finalScore).padStart(3)} tier=${m.tier.padEnd(7)} ${names}`);
    console.log(`    dealbreakers: ${dbCodes}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
