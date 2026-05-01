/**
 * Audit under-score failures: experimental score < expected min.
 * Determine if engine has calibration issues or golden pairs are wrong.
 * 
 * Run: npx ts-node --transpile-only scripts/audit-under-scores.ts
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compare, hasAnalyzedSignals } from '../src/matches/match-engine';
import type { ProfileJsonPayload } from '../src/profiles/profiles-json.service';

const ROOT = process.cwd();
const PROFILES_DIR = process.env.PROFILES_DATA_DIR?.trim() || join(ROOT, 'data', 'profiles');
const GOLDEN_PAIRS_PATH = join(ROOT, 'data', 'golden-pairs.json');

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

interface UnderScoreCase {
  pair: string;
  score: number;
  expectedMin: number;
  expectedMax: number;
  underBy: number;
  compatibility: number;
  friction: number;
  coverage: number;
  verdict: 'engine_wrong' | 'golden_wrong' | 'unclear';
  reason: string;
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

function assessUnderScore(
  pair: string,
  score: number,
  expectedMin: number,
  compatibility: number,
  friction: number,
  coverage: number,
): { verdict: 'engine_wrong' | 'golden_wrong' | 'unclear'; reason: string } {
  const underBy = expectedMin - score;

  // High friction (≥7) causing massive penalty
  if (friction >= 7) {
    return {
      verdict: 'golden_wrong',
      reason: 'Extreme friction (≥7) correctly penalized; expected band too optimistic',
    };
  }

  // High friction (5-6) causing significant penalty
  if (friction >= 5) {
    if (underBy >= 15) {
      return {
        verdict: 'engine_wrong',
        reason: 'Friction 5-6 penalty too harsh (>15 points under), needs calibration',
      };
    } else {
      return {
        verdict: 'unclear',
        reason: 'Friction 5-6 causing significant penalty, borderline case',
      };
    }
  }

  // Moderate friction (3-4) with significant under-score
  if (friction >= 3) {
    if (underBy >= 8) {
      return {
        verdict: 'engine_wrong',
        reason: 'Friction 3-4 penalty too harsh (≥8 points under), needs calibration',
      };
    } else if (underBy >= 5) {
      return {
        verdict: 'unclear',
        reason: 'Friction 3-4 causing moderate penalty, may need adjustment',
      };
    } else {
      return {
        verdict: 'golden_wrong',
        reason: 'Friction 3-4 correctly penalized; expected band slightly optimistic',
      };
    }
  }

  // Low friction (≤2) but still under-scoring
  if (friction <= 2) {
    if (coverage < 30) {
      return {
        verdict: 'unclear',
        reason: 'Sparse coverage (<30%) + low friction, edge case',
      };
    } else {
      return {
        verdict: 'engine_wrong',
        reason: 'Low friction (≤2) should not cause significant under-score',
      };
    }
  }

  // Default: unclear
  return {
    verdict: 'unclear',
    reason: 'Edge case requiring manual review',
  };
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('AUDIT: UNDER-SCORE FAILURES');
  console.log('='.repeat(80));
  console.log('');
  console.log('Analyzing cases where experimental score < expected min');
  console.log('');

  // Load data
  const profiles = await loadProfiles();
  const goldenPairs = await loadGoldenPairs();

  // Compute and analyze under-scores
  const underScoreCases: UnderScoreCase[] = [];

  for (const pair of goldenPairs) {
    const profileA = profiles.get(pair.profileAId);
    const profileB = profiles.get(pair.profileBId);

    if (!profileA || !profileB) continue;

    try {
      const result = compare(profileA, profileB);
      
      if (result.finalScore < pair.expectedFinalMin) {
        const pairLabel = `${pair.profileALabel} (#${pair.profileAId}) ↔ ${pair.profileBLabel} (#${pair.profileBId})`;
        const underBy = pair.expectedFinalMin - result.finalScore;
        const assessment = assessUnderScore(
          pairLabel,
          result.finalScore,
          pair.expectedFinalMin,
          result.compatibility,
          result.friction,
          result.coveragePercent,
        );

        underScoreCases.push({
          pair: pairLabel,
          score: result.finalScore,
          expectedMin: pair.expectedFinalMin,
          expectedMax: pair.expectedFinalMax,
          underBy,
          compatibility: result.compatibility,
          friction: result.friction,
          coverage: Math.round(result.coveragePercent),
          verdict: assessment.verdict,
          reason: assessment.reason,
        });
      }
    } catch (err) {
      // skip
    }
  }

  console.log(`Found ${underScoreCases.length} under-score cases (score < expected min)`);
  console.log('');

  // Sort by under-score amount (descending)
  underScoreCases.sort((a, b) => b.underBy - a.underBy);

  // Display each case
  console.log('='.repeat(80));
  console.log('DETAILED AUDIT');
  console.log('='.repeat(80));
  console.log('');

  for (let i = 0; i < underScoreCases.length; i++) {
    const c = underScoreCases[i];
    const verdictIcon = 
      c.verdict === 'engine_wrong' ? '✗' :
      c.verdict === 'golden_wrong' ? '⚠' :
      '?';

    console.log(`${i + 1}. ${verdictIcon} ${c.pair}`);
    console.log(`   Score: ${c.score} | Expected: ${c.expectedMin}-${c.expectedMax} | Under by: -${c.underBy}`);
    console.log(`   Compat: ${c.compatibility}, Friction: ${c.friction}, Coverage: ${c.coverage}%`);
    console.log(`   Verdict: ${c.verdict.toUpperCase()}`);
    console.log(`   Reason: ${c.reason}`);
    console.log('');
  }

  // Summary
  const engineWrong = underScoreCases.filter(c => c.verdict === 'engine_wrong').length;
  const goldenWrong = underScoreCases.filter(c => c.verdict === 'golden_wrong').length;
  const unclear = underScoreCases.filter(c => c.verdict === 'unclear').length;

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total under-score cases: ${underScoreCases.length}`);
  console.log('');
  console.log('Verdicts:');
  console.log(`  ✗ engine_wrong:  ${engineWrong} (${((engineWrong / underScoreCases.length) * 100).toFixed(1)}%)`);
  console.log(`  ⚠ golden_wrong:  ${goldenWrong} (${((goldenWrong / underScoreCases.length) * 100).toFixed(1)}%)`);
  console.log(`  ? unclear:       ${unclear} (${((unclear / underScoreCases.length) * 100).toFixed(1)}%)`);
  console.log('');

  // Final decision
  console.log('='.repeat(80));
  console.log('FINAL DECISION');
  console.log('='.repeat(80));
  console.log('');

  const engineWrongPct = (engineWrong / underScoreCases.length) * 100;

  if (engineWrongPct >= 30) {
    console.log('✗ FIX CALIBRATION (DO NOT UPDATE BANDS)');
    console.log('');
    console.log(`Rationale: ${engineWrongPct.toFixed(1)}% of under-scores are engine_wrong (≥30% threshold)`);
    console.log('');
    console.log('Recommendation:');
    console.log('  • DO NOT update expected bands');
    console.log('  • Fix friction penalty calibration first');
    console.log('  • Review friction scaling formula');
    console.log('  • Re-run validation after calibration fix');
    console.log('');
    console.log('Likely issues:');
    if (engineWrong > 0) {
      const highFrictionWrong = underScoreCases.filter(c => c.verdict === 'engine_wrong' && c.friction >= 5).length;
      const moderateFrictionWrong = underScoreCases.filter(c => c.verdict === 'engine_wrong' && c.friction >= 3 && c.friction < 5).length;
      
      if (highFrictionWrong > 0) {
        console.log(`  • High friction (≥5) penalty too harsh: ${highFrictionWrong} cases`);
      }
      if (moderateFrictionWrong > 0) {
        console.log(`  • Moderate friction (3-4) penalty too harsh: ${moderateFrictionWrong} cases`);
      }
    }
  } else {
    console.log('✓ SAFE TO UPDATE BANDS');
    console.log('');
    console.log(`Rationale: Only ${engineWrongPct.toFixed(1)}% of under-scores are engine_wrong (<30% threshold)`);
    console.log('');
    console.log('Assessment:');
    console.log('  • Under-scores are primarily due to high friction (correctly penalized)');
    console.log('  • Or expected bands were too optimistic');
    console.log('  • Engine calibration is acceptable');
    console.log('');
    console.log('Recommendation:');
    console.log('  • Proceed with updating expected bands for over-scores');
    console.log('  • Accept under-scores as correct behavior (high friction penalty)');
    console.log('  • Monitor friction 3-4 cases for future calibration');
  }
  console.log('');

  // Breakdown by friction level
  if (underScoreCases.length > 0) {
    console.log('='.repeat(80));
    console.log('BREAKDOWN BY FRICTION LEVEL');
    console.log('='.repeat(80));
    console.log('');

    const extremeFriction = underScoreCases.filter(c => c.friction >= 7);
    const highFriction = underScoreCases.filter(c => c.friction >= 5 && c.friction < 7);
    const moderateFriction = underScoreCases.filter(c => c.friction >= 3 && c.friction < 5);
    const lowFriction = underScoreCases.filter(c => c.friction < 3);

    if (extremeFriction.length > 0) {
      const avgUnder = extremeFriction.reduce((sum, c) => sum + c.underBy, 0) / extremeFriction.length;
      const engineWrongCount = extremeFriction.filter(c => c.verdict === 'engine_wrong').length;
      console.log(`Extreme friction (≥7): ${extremeFriction.length} cases`);
      console.log(`  Average under-score: -${avgUnder.toFixed(1)} points`);
      console.log(`  Engine wrong: ${engineWrongCount} cases`);
      console.log(`  Assessment: ${engineWrongCount === 0 ? '✓ Correctly penalized' : '✗ Penalty too harsh'}`);
      console.log('');
    }

    if (highFriction.length > 0) {
      const avgUnder = highFriction.reduce((sum, c) => sum + c.underBy, 0) / highFriction.length;
      const engineWrongCount = highFriction.filter(c => c.verdict === 'engine_wrong').length;
      console.log(`High friction (5-6): ${highFriction.length} cases`);
      console.log(`  Average under-score: -${avgUnder.toFixed(1)} points`);
      console.log(`  Engine wrong: ${engineWrongCount} cases`);
      console.log(`  Assessment: ${engineWrongCount === 0 ? '✓ Acceptable penalty' : '⚠ May need adjustment'}`);
      console.log('');
    }

    if (moderateFriction.length > 0) {
      const avgUnder = moderateFriction.reduce((sum, c) => sum + c.underBy, 0) / moderateFriction.length;
      const engineWrongCount = moderateFriction.filter(c => c.verdict === 'engine_wrong').length;
      console.log(`Moderate friction (3-4): ${moderateFriction.length} cases`);
      console.log(`  Average under-score: -${avgUnder.toFixed(1)} points`);
      console.log(`  Engine wrong: ${engineWrongCount} cases`);
      console.log(`  Assessment: ${engineWrongCount === 0 ? '✓ Acceptable penalty' : '⚠ Monitor for calibration'}`);
      console.log('');
    }

    if (lowFriction.length > 0) {
      const avgUnder = lowFriction.reduce((sum, c) => sum + c.underBy, 0) / lowFriction.length;
      const engineWrongCount = lowFriction.filter(c => c.verdict === 'engine_wrong').length;
      console.log(`Low friction (<3): ${lowFriction.length} cases`);
      console.log(`  Average under-score: -${avgUnder.toFixed(1)} points`);
      console.log(`  Engine wrong: ${engineWrongCount} cases`);
      console.log(`  Assessment: ${engineWrongCount > 0 ? '✗ Unexpected under-score' : '✓ Acceptable'}`);
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('END OF AUDIT');
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
