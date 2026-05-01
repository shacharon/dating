/**
 * Focused segment evaluation: sparse high-compatibility and high-friction matches.
 * Analyzes whether penalties are appropriately calibrated.
 * 
 * Run: npx ts-node --transpile-only scripts/segment-evaluation.ts
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const MATCHES_DIR = process.env.MATCHES_DATA_DIR?.trim() || join(process.cwd(), 'data', 'matches');
const PROFILES_DIR = process.env.PROFILES_DATA_DIR?.trim() || join(process.cwd(), 'data', 'profiles');

interface MatchRecord {
  aId: string;
  bId: string;
  a?: { name?: string };
  b?: { name?: string };
  finalScore: number;
  compatibility: number;
  friction: number;
  coveragePercent: number;
  balance?: { tier?: string; ratio?: number };
  dealbreakers?: Array<{ code: string; severity: string }>;
  debug?: {
    tier?: string;
    dealbreakers?: Array<{ code: string; severity: string }>;
  };
}

async function loadAllMatches(): Promise<MatchRecord[]> {
  const entries = await readdir(MATCHES_DIR);
  const jsonFiles = entries.filter(
    (f) => f.endsWith('.json') && !f.endsWith('.json.tmp') && f !== 'index.json',
  );

  const matches: MatchRecord[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(MATCHES_DIR, file), 'utf8');
      const parsed = JSON.parse(raw) as any;
      if (parsed && typeof parsed === 'object') {
        matches.push({
          aId: parsed.aId || '',
          bId: parsed.bId || '',
          a: parsed.a,
          b: parsed.b,
          finalScore: parsed.finalScore ?? parsed.overall ?? 0,
          compatibility: parsed.compatibility ?? 0,
          friction: parsed.friction ?? 0,
          coveragePercent: parsed.coveragePercent ?? parsed.coverage ?? 0,
          balance: parsed.balance,
          dealbreakers: parsed.dealbreakers,
          debug: parsed.debug,
        });
      }
    } catch {
      // skip invalid JSON
    }
  }
  return matches;
}

async function loadProfileNames(): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  try {
    const entries = await readdir(PROFILES_DIR);
    const jsonFiles = entries.filter((f) => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
      try {
        const raw = await readFile(join(PROFILES_DIR, file), 'utf8');
        const parsed = JSON.parse(raw) as any;
        if (parsed.id && parsed.name) {
          nameMap.set(parsed.id, parsed.name);
        }
      } catch {
        // skip
      }
    }
  } catch {
    // profiles dir might not exist
  }
  return nameMap;
}

function getProfileName(id: string, nameMap: Map<string, string>, fallback?: string): string {
  return nameMap.get(id) || fallback || `#${id}`;
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function analyzeSegment(
  matches: MatchRecord[],
  nameMap: Map<string, string>,
  title: string,
  filterFn: (m: MatchRecord) => boolean,
): void {
  console.log('='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
  console.log('');

  const segment = matches.filter(filterFn);

  if (segment.length === 0) {
    console.log('No matches found in this segment.');
    console.log('');
    return;
  }

  // Statistics
  const scores = segment.map(m => m.finalScore).sort((a, b) => a - b);
  const compatibilities = segment.map(m => m.compatibility);
  const frictions = segment.map(m => m.friction);
  const coverages = segment.map(m => m.coveragePercent);

  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const p50Score = percentile(scores, 50);
  const p90Score = percentile(scores, 90);
  const maxScore = Math.max(...scores);

  const avgCompat = compatibilities.reduce((s, v) => s + v, 0) / compatibilities.length;
  const avgFriction = frictions.reduce((s, v) => s + v, 0) / frictions.length;
  const avgCoverage = coverages.reduce((s, v) => s + v, 0) / coverages.length;

  console.log(`Total matches: ${segment.length}`);
  console.log('');
  console.log('Score distribution:');
  console.log(`  Average:    ${avgScore.toFixed(2)}`);
  console.log(`  Median:     ${p50Score}`);
  console.log(`  p90:        ${p90Score}`);
  console.log(`  Max:        ${maxScore}`);
  console.log('');
  console.log('Segment characteristics:');
  console.log(`  Avg compatibility: ${avgCompat.toFixed(1)}`);
  console.log(`  Avg friction:      ${avgFriction.toFixed(1)}`);
  console.log(`  Avg coverage:      ${avgCoverage.toFixed(1)}%`);
  console.log('');

  // Top 10 examples
  const sortedByScore = [...segment].sort((a, b) => b.finalScore - a.finalScore);
  const top10 = sortedByScore.slice(0, 10);

  console.log('Top 10 examples (highest scores in segment):');
  console.log('');
  for (let i = 0; i < top10.length; i++) {
    const m = top10[i];
    const aName = getProfileName(m.aId, nameMap, m.a?.name);
    const bName = getProfileName(m.bId, nameMap, m.b?.name);
    console.log(`${i + 1}. ${aName} ↔ ${bName}`);
    console.log(`   score: ${m.finalScore}, compatibility: ${m.compatibility}, friction: ${m.friction}, coverage: ${Math.round(m.coveragePercent)}%`);
    
    // Calculate expected score (rough heuristic: compatibility - friction penalty)
    const expectedScore = m.compatibility - (m.friction * 2);
    const gap = m.finalScore - expectedScore;
    console.log(`   expected ~${Math.round(expectedScore)} (gap: ${gap >= 0 ? '+' : ''}${gap.toFixed(0)})`);
    console.log('');
  }

  // Pattern analysis
  console.log('Pattern analysis:');
  console.log('');

  // Calculate score suppression
  const avgExpectedScore = segment.reduce((sum, m) => {
    const expected = m.compatibility - (m.friction * 2);
    return sum + expected;
  }, 0) / segment.length;

  const suppression = avgScore - avgExpectedScore;
  console.log(`Score suppression analysis:`);
  console.log(`  Average actual score:   ${avgScore.toFixed(1)}`);
  console.log(`  Average expected score: ${avgExpectedScore.toFixed(1)} (compatibility - 2×friction)`);
  console.log(`  Suppression:            ${suppression.toFixed(1)} points ${suppression < 0 ? '(UNDER actual)' : '(OVER actual)'}`);
  console.log('');

  // Compatibility vs score correlation
  const compatScoreGaps = segment.map(m => m.compatibility - m.finalScore);
  const avgGap = compatScoreGaps.reduce((s, v) => s + v, 0) / compatScoreGaps.length;
  const maxGap = Math.max(...compatScoreGaps);
  console.log(`Compatibility vs finalScore gap:`);
  console.log(`  Average gap: ${avgGap.toFixed(1)} points (compatibility higher)`);
  console.log(`  Max gap:     ${maxGap.toFixed(0)} points`);
  console.log('');

  // Friction penalty analysis
  const frictionPenalties = segment.map(m => {
    const baseScore = m.compatibility;
    const penalty = baseScore - m.finalScore;
    return { friction: m.friction, penalty, match: m };
  });
  const avgPenaltyPerFriction = frictionPenalties.reduce((sum, fp) => {
    return sum + (fp.friction > 0 ? fp.penalty / fp.friction : 0);
  }, 0) / frictionPenalties.filter(fp => fp.friction > 0).length;

  console.log(`Friction penalty impact:`);
  console.log(`  Avg penalty per friction point: ${avgPenaltyPerFriction.toFixed(1)} score points`);
  console.log('');

  // Coverage penalty analysis (for sparse segment)
  if (avgCoverage < 50) {
    const coveragePenalties = segment.map(m => {
      const penaltyFactor = (50 - m.coveragePercent) / 50; // rough estimate
      return penaltyFactor;
    });
    const avgCoveragePenaltyFactor = coveragePenalties.reduce((s, v) => s + v, 0) / coveragePenalties.length;
    console.log(`Coverage penalty (sparse data):`);
    console.log(`  Avg coverage penalty factor: ${(avgCoveragePenaltyFactor * 100).toFixed(1)}%`);
    console.log('');
  }
}

function renderVerdict(
  segmentName: string,
  verdict: 'OK' | 'OVER-PENALIZED' | 'UNDER-PENALIZED',
  reasoning: string[],
): void {
  console.log('='.repeat(80));
  console.log(`VERDICT: ${segmentName}`);
  console.log('='.repeat(80));
  console.log('');
  console.log(`Status: ${verdict}`);
  console.log('');
  console.log('Reasoning:');
  for (const reason of reasoning) {
    console.log(`  • ${reason}`);
  }
  console.log('');
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('SEGMENT EVALUATION REPORT');
  console.log('Focus: Sparse High-Compatibility & High-Friction Matches');
  console.log('='.repeat(80));
  console.log('');

  const matches = await loadAllMatches();
  const nameMap = await loadProfileNames();

  console.log(`Total dataset: ${matches.length} matches`);
  console.log('');

  // Segment 1: Sparse High-Compatibility
  analyzeSegment(
    matches,
    nameMap,
    'SEGMENT 1: SPARSE HIGH-COMPATIBILITY (compatibility ≥75, coverage ≤40%)',
    (m) => m.compatibility >= 75 && m.coveragePercent <= 40,
  );

  // Segment 2: High Friction
  analyzeSegment(
    matches,
    nameMap,
    'SEGMENT 2: HIGH FRICTION (friction ≥3)',
    (m) => m.friction >= 3,
  );

  // Verdicts
  console.log('');
  console.log('');

  // Segment 1 verdict
  const sparseHighCompat = matches.filter(m => m.compatibility >= 75 && m.coveragePercent <= 40);
  const avgScoreSparse = sparseHighCompat.reduce((s, m) => s + m.finalScore, 0) / sparseHighCompat.length;
  const avgCompatSparse = sparseHighCompat.reduce((s, m) => s + m.compatibility, 0) / sparseHighCompat.length;
  const gapSparse = avgCompatSparse - avgScoreSparse;

  let verdictSparse: 'OK' | 'OVER-PENALIZED' | 'UNDER-PENALIZED';
  const reasoningSparse: string[] = [];

  if (gapSparse > 15) {
    verdictSparse = 'OVER-PENALIZED';
    reasoningSparse.push(`Average gap of ${gapSparse.toFixed(1)} points between compatibility and finalScore is excessive`);
    reasoningSparse.push(`Matches with 75+ compatibility should score higher even with limited coverage`);
    reasoningSparse.push(`Sparse calibration is too conservative when available signals strongly agree`);
  } else if (gapSparse > 10) {
    verdictSparse = 'OVER-PENALIZED';
    reasoningSparse.push(`Gap of ${gapSparse.toFixed(1)} points suggests moderate over-penalization`);
    reasoningSparse.push(`High-agreement signals (75+ compatibility) deserve more trust despite sparse data`);
  } else if (gapSparse < 5) {
    verdictSparse = 'UNDER-PENALIZED';
    reasoningSparse.push(`Gap of only ${gapSparse.toFixed(1)} points may be too lenient for <40% coverage`);
    reasoningSparse.push(`Sparse data should maintain some skepticism even with high compatibility`);
  } else {
    verdictSparse = 'OK';
    reasoningSparse.push(`Gap of ${gapSparse.toFixed(1)} points is reasonable for sparse high-compatibility matches`);
    reasoningSparse.push(`Balance between trusting strong signals and maintaining skepticism on limited data`);
  }

  renderVerdict('SPARSE HIGH-COMPATIBILITY', verdictSparse, reasoningSparse);

  // Segment 2 verdict
  const highFriction = matches.filter(m => m.friction >= 3);
  const avgScoreFriction = highFriction.reduce((s, m) => s + m.finalScore, 0) / highFriction.length;
  const avgCompatFriction = highFriction.reduce((s, m) => s + m.compatibility, 0) / highFriction.length;
  const avgFrictionValue = highFriction.reduce((s, m) => s + m.friction, 0) / highFriction.length;
  const gapFriction = avgCompatFriction - avgScoreFriction;

  // Calculate expected penalty (friction × 2-3 is reasonable)
  const expectedPenalty = avgFrictionValue * 2.5;
  const actualPenalty = gapFriction;

  let verdictFriction: 'OK' | 'OVER-PENALIZED' | 'UNDER-PENALIZED';
  const reasoningFriction: string[] = [];

  if (actualPenalty > expectedPenalty * 1.5) {
    verdictFriction = 'OVER-PENALIZED';
    reasoningFriction.push(`Actual penalty of ${actualPenalty.toFixed(1)} points exceeds expected ${expectedPenalty.toFixed(1)} by ${((actualPenalty / expectedPenalty - 1) * 100).toFixed(0)}%`);
    reasoningFriction.push(`Friction ≥3 is acting as near-disqualifier, even for compatible pairs`);
    reasoningFriction.push(`Some friction can be healthy in relationships; current penalty may be too harsh`);
  } else if (actualPenalty < expectedPenalty * 0.7) {
    verdictFriction = 'UNDER-PENALIZED';
    reasoningFriction.push(`Actual penalty of ${actualPenalty.toFixed(1)} points is below expected ${expectedPenalty.toFixed(1)}`);
    reasoningFriction.push(`High friction should have meaningful impact on match quality`);
  } else {
    verdictFriction = 'OK';
    reasoningFriction.push(`Actual penalty of ${actualPenalty.toFixed(1)} points aligns with expected ${expectedPenalty.toFixed(1)}`);
    reasoningFriction.push(`Friction penalty is appropriately calibrated (2-3 points per friction unit)`);
  }

  renderVerdict('HIGH FRICTION', verdictFriction, reasoningFriction);

  // Calibration suggestions
  console.log('='.repeat(80));
  console.log('CALIBRATION SUGGESTIONS');
  console.log('='.repeat(80));
  console.log('');

  if (verdictSparse === 'OVER-PENALIZED') {
    console.log('1. SPARSE HIGH-COMPATIBILITY CALIBRATION:');
    console.log('');
    console.log('   Suggestion A: Soften sparse penalty for high-agreement signals');
    console.log('   - When compatibility ≥75 AND coverage 30-40%, reduce sparse penalty by 30%');
    console.log('   - When compatibility ≥80 AND coverage 30-40%, reduce sparse penalty by 40%');
    console.log('   - Rationale: Strong signal agreement deserves more trust despite limited data');
    console.log('');
    console.log('   Suggestion B: Add "high-confidence sparse" tier');
    console.log('   - If coverage 30-40% but all available signals agree (low variance), treat as "quality sparse"');
    console.log('   - Apply lighter penalty (5-8 points instead of 10-15 points)');
    console.log('   - Rationale: 30-40% coverage with strong agreement is more reliable than 30-40% with mixed signals');
    console.log('');
  }

  if (verdictFriction === 'OVER-PENALIZED') {
    console.log('2. HIGH FRICTION CALIBRATION:');
    console.log('');
    console.log('   Suggestion A: Cap friction penalty at diminishing returns');
    console.log('   - Friction 1-3: linear penalty (2-3 points per unit)');
    console.log('   - Friction 4-6: diminishing returns (1.5-2 points per unit)');
    console.log('   - Friction 7+: cap at 15-18 total penalty points');
    console.log('   - Rationale: Avoid friction becoming an absolute disqualifier for otherwise strong matches');
    console.log('');
    console.log('   Suggestion B: Context-aware friction penalty');
    console.log('   - If compatibility ≥80 AND friction 3-5, reduce friction penalty by 25%');
    console.log('   - If compatibility ≥85 AND friction 3-5, reduce friction penalty by 35%');
    console.log('   - Rationale: Very high compatibility may indicate friction is manageable/healthy tension');
    console.log('');
  }

  if (verdictSparse === 'OVER-PENALIZED' && verdictFriction === 'OVER-PENALIZED') {
    console.log('3. COMBINED CALIBRATION (both segments over-penalized):');
    console.log('');
    console.log('   Suggestion: Avoid double-penalization');
    console.log('   - When BOTH sparse data AND high friction are present, cap total penalty');
    console.log('   - Max combined penalty: 20 points (not additive)');
    console.log('   - Rationale: Compounding penalties can create unrealistic floor scores');
    console.log('');
  }

  if (verdictSparse === 'OK' && verdictFriction === 'OK') {
    console.log('Current calibration appears well-balanced for both segments.');
    console.log('No immediate changes recommended.');
    console.log('');
    console.log('Optional refinements:');
    console.log('  • Monitor edge cases (compatibility ≥85, friction ≥5)');
    console.log('  • Consider adding tier-based adjustments when tier data is available');
    console.log('  • Track user feedback on matches in these segments');
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('END OF SEGMENT EVALUATION');
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
