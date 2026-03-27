/**
 * Validate experimental engine: recompute matches and check golden pairs.
 * 
 * Run: npx ts-node --transpile-only scripts/validate-experiment.ts
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compare, hasAnalyzedSignals } from '../src/matches/match-engine';
import type { ProfileJsonPayload } from '../src/profiles/profiles-json.service';

const ROOT = process.cwd();
const PROFILES_DIR = process.env.PROFILES_DATA_DIR?.trim() || join(ROOT, 'data', 'profiles');
const GOLDEN_PAIRS_PATH = join(ROOT, 'data', 'golden-pairs.json');
const BASELINE_REPORT_PATH = join(ROOT, 'docs', 'golden-pairs.md');

interface GoldenPair {
  profileAId: string;
  profileBId: string;
  profileALabel: string;
  profileBLabel: string;
  expectedJudgment: string;
  expectedFinalMin: number;
  expectedFinalMax: number;
  notes: string;
}

interface ValidationResult {
  index: number;
  pairLabel: string;
  expectedMin: number;
  expectedMax: number;
  experimentalScore: number;
  baselineScore: number | null;
  experimentalStatus: 'PASS' | 'FAIL';
  baselineStatus: 'PASS' | 'FAIL' | 'UNKNOWN';
  compatibility: number;
  friction: number;
  coverage: number;
  confidence: number;
  delta: number;
}

async function loadProfiles(): Promise<Map<string, ProfileJsonPayload>> {
  const profileMap = new Map<string, ProfileJsonPayload>();
  const entries = await readdir(PROFILES_DIR);
  const jsonFiles = entries.filter((f) => f.endsWith('.json'));

  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(PROFILES_DIR, file), 'utf8');
      const profile = JSON.parse(raw) as ProfileJsonPayload;
      if (profile.id && hasAnalyzedSignals(profile)) {
        profileMap.set(profile.id, profile);
      }
    } catch {
      // skip invalid
    }
  }
  return profileMap;
}

async function loadGoldenPairs(): Promise<GoldenPair[]> {
  const raw = await readFile(GOLDEN_PAIRS_PATH, 'utf8');
  return JSON.parse(raw) as GoldenPair[];
}

function parseBaselineReport(report: string): Map<string, number> {
  const scores = new Map<string, number>();
  const lines = report.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('| ') && line.includes('↔')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 12) {
        const pairInfo = parts[2]; // Pair column
        const finalScore = parts[11]; // finalScore column
        
        if (pairInfo && finalScore && finalScore !== '—' && finalScore !== 'finalScore') {
          const score = parseInt(finalScore, 10);
          if (!isNaN(score)) {
            scores.set(pairInfo, score);
          }
        }
      }
    }
  }
  
  return scores;
}

async function loadBaselineScores(): Promise<Map<string, number>> {
  try {
    const report = await readFile(BASELINE_REPORT_PATH, 'utf8');
    return parseBaselineReport(report);
  } catch {
    return new Map();
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('EXPERIMENTAL ENGINE VALIDATION');
  console.log('='.repeat(80));
  console.log('');
  console.log('Changes:');
  console.log('  • finalScore = compatibility - frictionPenalty (NO coverage multiplier)');
  console.log('  • Hard cap at 90');
  console.log('  • Confidence guard: if coverage < 25%, confidence <= 75%');
  console.log('');

  // Load data
  console.log('Loading profiles...');
  const profiles = await loadProfiles();
  console.log(`Loaded ${profiles.size} analyzed profiles`);
  console.log('');

  console.log('Loading golden pairs...');
  const goldenPairs = await loadGoldenPairs();
  console.log(`Loaded ${goldenPairs.length} golden pairs`);
  console.log('');

  console.log('Loading baseline scores...');
  const baselineScores = await loadBaselineScores();
  console.log(`Loaded ${baselineScores.size} baseline scores`);
  console.log('');

  // Compute experimental scores for golden pairs
  console.log('Computing experimental scores for golden pairs...');
  const results: ValidationResult[] = [];
  let computed = 0;

  for (let i = 0; i < goldenPairs.length; i++) {
    const pair = goldenPairs[i];
    const profileA = profiles.get(pair.profileAId);
    const profileB = profiles.get(pair.profileBId);

    if (!profileA || !profileB) {
      console.log(`  Skipping pair ${i + 1}: missing profile`);
      continue;
    }

    try {
        const result = compare(profileA, profileB);
      const pairLabel = `${pair.profileALabel} (#${pair.profileAId}) ↔ ${pair.profileBLabel} (#${pair.profileBId})`;
      const baselineScore = baselineScores.get(pairLabel) ?? null;
      const experimentalStatus = 
        result.finalScore >= pair.expectedFinalMin && result.finalScore <= pair.expectedFinalMax
          ? 'PASS'
          : 'FAIL';
      const baselineStatus = baselineScore !== null
        ? (baselineScore >= pair.expectedFinalMin && baselineScore <= pair.expectedFinalMax ? 'PASS' : 'FAIL')
        : 'UNKNOWN';
      const delta = baselineScore !== null ? result.finalScore - baselineScore : 0;

      results.push({
        index: i + 1,
        pairLabel,
        expectedMin: pair.expectedFinalMin,
        expectedMax: pair.expectedFinalMax,
        experimentalScore: result.finalScore,
        baselineScore,
        experimentalStatus,
        baselineStatus,
        compatibility: result.compatibility,
        friction: result.friction,
        coverage: Math.round(result.coveragePercent),
        confidence: Math.round(result.confidence * 100),
        delta,
      });

      computed++;
    } catch (err) {
      console.log(`  Error computing pair ${i + 1}: ${err}`);
    }
  }

  console.log(`Computed ${computed} experimental scores`);
  console.log('');

  // Summary
  const experimentalPass = results.filter(r => r.experimentalStatus === 'PASS').length;
  const experimentalFail = results.filter(r => r.experimentalStatus === 'FAIL').length;
  const baselinePass = results.filter(r => r.baselineStatus === 'PASS').length;
  const baselineFail = results.filter(r => r.baselineStatus === 'FAIL').length;

  console.log('='.repeat(80));
  console.log('GOLDEN PAIRS VALIDATION RESULTS');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total pairs evaluated: ${results.length}`);
  console.log('');
  console.log('Experimental engine:');
  console.log(`  PASS: ${experimentalPass} (${((experimentalPass / results.length) * 100).toFixed(1)}%)`);
  console.log(`  FAIL: ${experimentalFail} (${((experimentalFail / results.length) * 100).toFixed(1)}%)`);
  console.log('');
  console.log('Baseline engine:');
  console.log(`  PASS: ${baselinePass} (${((baselinePass / results.length) * 100).toFixed(1)}%)`);
  console.log(`  FAIL: ${baselineFail} (${((baselineFail / results.length) * 100).toFixed(1)}%)`);
  console.log('');
  console.log(`Delta: ${experimentalPass >= baselinePass ? '+' : ''}${experimentalPass - baselinePass} PASS (${experimentalFail >= baselineFail ? '' : '-'}${baselineFail - experimentalFail} FAIL)`);
  console.log('');

  // Detailed results
  console.log('='.repeat(80));
  console.log('DETAILED RESULTS');
  console.log('='.repeat(80));
  console.log('');

  for (const r of results) {
    const statusIcon = r.experimentalStatus === 'PASS' ? '✓' : '✗';
    const baselineStatusIcon = r.baselineStatus === 'PASS' ? '✓' : r.baselineStatus === 'FAIL' ? '✗' : '?';
    const statusChange = r.experimentalStatus !== r.baselineStatus && r.baselineStatus !== 'UNKNOWN'
      ? ` (was ${baselineStatusIcon})`
      : '';
    
    console.log(`${r.index}. ${statusIcon} ${r.pairLabel}${statusChange}`);
    console.log(`   Expected: ${r.expectedMin}-${r.expectedMax}`);
    console.log(`   Experimental: ${r.experimentalScore} | Baseline: ${r.baselineScore ?? 'N/A'} | Delta: ${r.delta >= 0 ? '+' : ''}${r.delta}`);
    console.log(`   Compat: ${r.compatibility}, Friction: ${r.friction}, Coverage: ${r.coverage}%, Confidence: ${r.confidence}%`);
    console.log('');
  }

  // Status changes
  const improved = results.filter(r => r.experimentalStatus === 'PASS' && r.baselineStatus === 'FAIL');
  const regressed = results.filter(r => r.experimentalStatus === 'FAIL' && r.baselineStatus === 'PASS');

  if (improved.length > 0) {
    console.log('='.repeat(80));
    console.log(`IMPROVED (${improved.length}): Baseline FAIL → Experimental PASS`);
    console.log('='.repeat(80));
    console.log('');
    for (const r of improved) {
      console.log(`✓ ${r.pairLabel}`);
      console.log(`  Expected: ${r.expectedMin}-${r.expectedMax}`);
      console.log(`  Baseline: ${r.baselineScore} (FAIL) → Experimental: ${r.experimentalScore} (PASS)`);
      console.log(`  Delta: +${r.delta} points`);
      console.log('');
    }
  }

  if (regressed.length > 0) {
    console.log('='.repeat(80));
    console.log(`REGRESSED (${regressed.length}): Baseline PASS → Experimental FAIL`);
    console.log('='.repeat(80));
    console.log('');
    for (const r of regressed) {
      console.log(`✗ ${r.pairLabel}`);
      console.log(`  Expected: ${r.expectedMin}-${r.expectedMax}`);
      console.log(`  Baseline: ${r.baselineScore} (PASS) → Experimental: ${r.experimentalScore} (FAIL)`);
      console.log(`  Delta: ${r.delta >= 0 ? '+' : ''}${r.delta} points`);
      console.log('');
    }
  }

  // Top 10 matches review
  console.log('='.repeat(80));
  console.log('TOP 10 MATCHES - USER-FACING SANITY CHECK');
  console.log('='.repeat(80));
  console.log('');
  console.log('Review: Does this "feel like" an 80+ match?');
  console.log('');

  const top10 = results
    .filter(r => r.experimentalScore >= 80)
    .sort((a, b) => b.experimentalScore - a.experimentalScore)
    .slice(0, 10);

  if (top10.length === 0) {
    console.log('No matches scored 80+ in experimental engine.');
  } else {
    for (let i = 0; i < top10.length; i++) {
      const r = top10[i];
      console.log(`${i + 1}. ${r.pairLabel}`);
      console.log(`   Score: ${r.experimentalScore} (baseline: ${r.baselineScore ?? 'N/A'})`);
      console.log(`   Compat: ${r.compatibility}, Friction: ${r.friction}, Coverage: ${r.coverage}%`);
      console.log(`   Confidence: ${r.confidence}%`);
      console.log(`   → Feels like 80+ match? [MANUAL REVIEW REQUIRED]`);
      console.log('');
    }
  }

  // Verdict
  console.log('='.repeat(80));
  console.log('VERDICT');
  console.log('='.repeat(80));
  console.log('');

  if (experimentalPass > baselinePass) {
    console.log(`✓ IMPROVEMENT: +${experimentalPass - baselinePass} more PASS vs baseline`);
  } else if (experimentalPass === baselinePass) {
    console.log(`= NEUTRAL: Same number of PASS as baseline`);
  } else {
    console.log(`✗ REGRESSION: ${baselinePass - experimentalPass} fewer PASS vs baseline`);
  }
  console.log('');

  if (regressed.length === 0) {
    console.log('✓ NO REGRESSIONS: All baseline PASS remain PASS');
  } else {
    console.log(`⚠ REGRESSIONS: ${regressed.length} baseline PASS became FAIL`);
  }
  console.log('');

  if (improved.length > 0) {
    console.log(`✓ IMPROVEMENTS: ${improved.length} baseline FAIL became PASS`);
  }
  console.log('');

  const passRate = (experimentalPass / results.length) * 100;
  if (passRate >= 70) {
    console.log(`✓ PASS RATE: ${passRate.toFixed(1)}% (acceptable)`);
  } else if (passRate >= 60) {
    console.log(`⚠ PASS RATE: ${passRate.toFixed(1)}% (marginal)`);
  } else {
    console.log(`✗ PASS RATE: ${passRate.toFixed(1)}% (too low)`);
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('END OF VALIDATION');
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
