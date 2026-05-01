/**
 * Audit over-score failures: experimental score > expected max.
 * Determine if engine is right or golden pairs expected bands are wrong.
 * 
 * Run: npx ts-node --transpile-only scripts/audit-over-scores.ts
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

interface OverScoreCase {
  pair: string;
  score: number;
  expectedMin: number;
  expectedMax: number;
  overBy: number;
  compatibility: number;
  friction: number;
  coverage: number;
  verdict: 'engine_right' | 'golden_wrong' | 'unclear';
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

function assessOverScore(
  pair: string,
  score: number,
  expectedMax: number,
  compatibility: number,
  friction: number,
  coverage: number,
): { verdict: 'engine_right' | 'golden_wrong' | 'unclear'; reason: string } {
  const overBy = score - expectedMax;

  // High compatibility (≥85) + low friction (≤1) should score 80-90
  if (compatibility >= 85 && friction <= 1) {
    return {
      verdict: 'engine_right',
      reason: 'Exceptional compatibility (≥85) + minimal friction (≤1) deserves 80-90 range',
    };
  }

  // High compatibility (80-84) + low friction (≤1) should score 75-85
  if (compatibility >= 80 && compatibility < 85 && friction <= 1) {
    return {
      verdict: 'engine_right',
      reason: 'High compatibility (80-84) + minimal friction deserves 75-85 range',
    };
  }

  // Good compatibility (75-79) + low friction (≤1) should score 70-80
  if (compatibility >= 75 && compatibility < 80 && friction <= 1) {
    if (overBy <= 3) {
      return {
        verdict: 'engine_right',
        reason: 'Good compatibility (75-79) + minimal friction, slight over-score acceptable',
      };
    } else {
      return {
        verdict: 'unclear',
        reason: 'Good compatibility but over-score >3 points, needs review',
      };
    }
  }

  // Moderate compatibility (70-74) + low friction
  if (compatibility >= 70 && compatibility < 75 && friction <= 1) {
    if (overBy <= 2) {
      return {
        verdict: 'engine_right',
        reason: 'Moderate compatibility + minimal friction, slight over-score acceptable',
      };
    } else {
      return {
        verdict: 'golden_wrong',
        reason: 'Expected band too conservative for this compatibility level',
      };
    }
  }

  // Any case with friction ≥2
  if (friction >= 2) {
    if (overBy <= 2) {
      return {
        verdict: 'unclear',
        reason: 'Moderate friction present, small over-score may indicate expected band issue',
      };
    } else {
      return {
        verdict: 'golden_wrong',
        reason: 'Significant over-score despite friction suggests expected band too low',
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
  console.log('AUDIT: OVER-SCORE FAILURES');
  console.log('='.repeat(80));
  console.log('');
  console.log('Analyzing cases where experimental score > expected max');
  console.log('');

  // Load data
  const profiles = await loadProfiles();
  const goldenPairs = await loadGoldenPairs();

  // Compute and analyze over-scores
  const overScoreCases: OverScoreCase[] = [];

  for (const pair of goldenPairs) {
    const profileA = profiles.get(pair.profileAId);
    const profileB = profiles.get(pair.profileBId);

    if (!profileA || !profileB) continue;

    try {
      const result = compare(profileA, profileB);
      
      if (result.finalScore > pair.expectedFinalMax) {
        const pairLabel = `${pair.profileALabel} (#${pair.profileAId}) ↔ ${pair.profileBLabel} (#${pair.profileBId})`;
        const overBy = result.finalScore - pair.expectedFinalMax;
        const assessment = assessOverScore(
          pairLabel,
          result.finalScore,
          pair.expectedFinalMax,
          result.compatibility,
          result.friction,
          result.coveragePercent,
        );

        overScoreCases.push({
          pair: pairLabel,
          score: result.finalScore,
          expectedMin: pair.expectedFinalMin,
          expectedMax: pair.expectedFinalMax,
          overBy,
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

  console.log(`Found ${overScoreCases.length} over-score cases (score > expected max)`);
  console.log('');

  // Sort by over-score amount (descending)
  overScoreCases.sort((a, b) => b.overBy - a.overBy);

  // Display each case
  console.log('='.repeat(80));
  console.log('DETAILED AUDIT');
  console.log('='.repeat(80));
  console.log('');

  for (let i = 0; i < overScoreCases.length; i++) {
    const c = overScoreCases[i];
    const verdictIcon = 
      c.verdict === 'engine_right' ? '✓' :
      c.verdict === 'golden_wrong' ? '⚠' :
      '?';

    console.log(`${i + 1}. ${verdictIcon} ${c.pair}`);
    console.log(`   Score: ${c.score} | Expected: ${c.expectedMin}-${c.expectedMax} | Over by: +${c.overBy}`);
    console.log(`   Compat: ${c.compatibility}, Friction: ${c.friction}, Coverage: ${c.coverage}%`);
    console.log(`   Verdict: ${c.verdict.toUpperCase()}`);
    console.log(`   Reason: ${c.reason}`);
    console.log('');
  }

  // Summary
  const engineRight = overScoreCases.filter(c => c.verdict === 'engine_right').length;
  const goldenWrong = overScoreCases.filter(c => c.verdict === 'golden_wrong').length;
  const unclear = overScoreCases.filter(c => c.verdict === 'unclear').length;

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total over-score cases: ${overScoreCases.length}`);
  console.log('');
  console.log('Verdicts:');
  console.log(`  ✓ engine_right:  ${engineRight} (${((engineRight / overScoreCases.length) * 100).toFixed(1)}%)`);
  console.log(`  ⚠ golden_wrong:  ${goldenWrong} (${((goldenWrong / overScoreCases.length) * 100).toFixed(1)}%)`);
  console.log(`  ? unclear:       ${unclear} (${((unclear / overScoreCases.length) * 100).toFixed(1)}%)`);
  console.log('');

  // Final decision
  console.log('='.repeat(80));
  console.log('FINAL DECISION');
  console.log('='.repeat(80));
  console.log('');

  const engineRightPct = (engineRight / overScoreCases.length) * 100;
  const combinedConfident = ((engineRight + goldenWrong) / overScoreCases.length) * 100;

  if (engineRightPct >= 70) {
    console.log('✓ UPDATE EXPECTED BANDS');
    console.log('');
    console.log(`Rationale: ${engineRightPct.toFixed(1)}% of over-scores are engine_right (≥70% threshold)`);
    console.log('');
    console.log('Recommendation:');
    console.log('  • Update expected bands upward by +2 to +5 points');
    console.log('  • Focus on high-compatibility + low-friction pairs');
    console.log('  • Re-run validation after update');
    console.log('');
    console.log('Suggested band adjustments:');
    console.log('  • Compatibility ≥85, friction ≤1: expected max +4 to +6 points');
    console.log('  • Compatibility 80-84, friction ≤1: expected max +3 to +5 points');
    console.log('  • Compatibility 75-79, friction ≤1: expected max +2 to +4 points');
  } else if (combinedConfident >= 70) {
    console.log('⚠ UPDATE EXPECTED BANDS (with caution)');
    console.log('');
    console.log(`Rationale: ${combinedConfident.toFixed(1)}% of over-scores are engine_right or golden_wrong (≥70% threshold)`);
    console.log('');
    console.log('Recommendation:');
    console.log('  • Update expected bands upward by +2 to +4 points (conservative)');
    console.log('  • Review unclear cases manually before finalizing');
    console.log('  • Re-run validation after update');
  } else {
    console.log('✗ DO NOT UPDATE BANDS');
    console.log('');
    console.log(`Rationale: Only ${engineRightPct.toFixed(1)}% of over-scores are engine_right (<70% threshold)`);
    console.log('');
    console.log('Recommendation:');
    console.log('  • Investigate calibration issues in experimental engine');
    console.log('  • Review unclear cases to understand scoring patterns');
    console.log('  • Consider adjusting compatibility or friction formulas');
    console.log('  • Do NOT update expected bands until engine is validated');
  }
  console.log('');

  // Specific recommendations
  if (engineRightPct >= 70 || combinedConfident >= 70) {
    console.log('='.repeat(80));
    console.log('SPECIFIC BAND ADJUSTMENTS');
    console.log('='.repeat(80));
    console.log('');

    // Group by compatibility range
    const highCompat = overScoreCases.filter(c => c.compatibility >= 85 && c.friction <= 1);
    const goodCompat = overScoreCases.filter(c => c.compatibility >= 80 && c.compatibility < 85 && c.friction <= 1);
    const moderateCompat = overScoreCases.filter(c => c.compatibility >= 75 && c.compatibility < 80 && c.friction <= 1);

    if (highCompat.length > 0) {
      const avgOver = highCompat.reduce((sum, c) => sum + c.overBy, 0) / highCompat.length;
      console.log(`High compatibility (≥85) + low friction (≤1): ${highCompat.length} cases`);
      console.log(`  Average over-score: +${avgOver.toFixed(1)} points`);
      console.log(`  Recommendation: Increase expected max by +${Math.ceil(avgOver)} points`);
      console.log('');
    }

    if (goodCompat.length > 0) {
      const avgOver = goodCompat.reduce((sum, c) => sum + c.overBy, 0) / goodCompat.length;
      console.log(`Good compatibility (80-84) + low friction (≤1): ${goodCompat.length} cases`);
      console.log(`  Average over-score: +${avgOver.toFixed(1)} points`);
      console.log(`  Recommendation: Increase expected max by +${Math.ceil(avgOver)} points`);
      console.log('');
    }

    if (moderateCompat.length > 0) {
      const avgOver = moderateCompat.reduce((sum, c) => sum + c.overBy, 0) / moderateCompat.length;
      console.log(`Moderate compatibility (75-79) + low friction (≤1): ${moderateCompat.length} cases`);
      console.log(`  Average over-score: +${avgOver.toFixed(1)} points`);
      console.log(`  Recommendation: Increase expected max by +${Math.ceil(avgOver)} points`);
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
