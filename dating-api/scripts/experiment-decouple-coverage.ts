/**
 * Experiment: Decouple score from coverage.
 * 
 * Computes matches using experimental engine where:
 * - finalScore = compatibility - frictionPenalty (NO coverage multiplier)
 * - coverage affects confidence ONLY
 * 
 * Compares results to baseline (current production scores).
 * 
 * Run: npx ts-node --transpile-only scripts/experiment-decouple-coverage.ts
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compare, hasAnalyzedSignals } from '../src/matches/match-engine';
import type { ProfileJsonPayload } from '../src/profiles/profiles-json.service';

const PROFILES_DIR = process.env.PROFILES_DATA_DIR?.trim() || join(process.cwd(), 'data', 'profiles');
const MATCHES_DIR = process.env.MATCHES_DATA_DIR?.trim() || join(process.cwd(), 'data', 'matches');

interface BaselineMatch {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  finalScore: number;
  compatibility: number;
  friction: number;
  coverage: number;
}

interface ExperimentalMatch {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  finalScore: number;
  compatibility: number;
  friction: number;
  coverage: number;
  confidence: number;
  delta: number; // vs baseline
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

async function loadBaselineMatches(): Promise<Map<string, BaselineMatch>> {
  const matchMap = new Map<string, BaselineMatch>();
  try {
    const entries = await readdir(MATCHES_DIR);
    const jsonFiles = entries.filter(
      (f) => f.endsWith('.json') && !f.endsWith('.json.tmp') && f !== 'index.json',
    );

    for (const file of jsonFiles) {
      try {
        const raw = await readFile(join(MATCHES_DIR, file), 'utf8');
        const parsed = JSON.parse(raw) as any;
        if (parsed && parsed.aId && parsed.bId) {
          const key = [parsed.aId, parsed.bId].sort().join('_');
          matchMap.set(key, {
            aId: parsed.aId,
            bId: parsed.bId,
            aName: parsed.a?.name || `#${parsed.aId}`,
            bName: parsed.b?.name || `#${parsed.bId}`,
            finalScore: parsed.finalScore ?? parsed.overall ?? 0,
            compatibility: parsed.compatibility ?? 0,
            friction: parsed.friction ?? 0,
            coverage: parsed.coveragePercent ?? parsed.coverage ?? 0,
          });
        }
      } catch {
        // skip
      }
    }
  } catch {
    // baseline dir might not exist
  }
  return matchMap;
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('EXPERIMENT: DECOUPLE SCORE FROM COVERAGE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Change: finalScore = compatibility - frictionPenalty (NO coverage multiplier)');
  console.log('Coverage affects confidence ONLY.');
  console.log('');

  // Load profiles
  console.log('Loading profiles...');
  const profiles = await loadProfiles();
  const profileList = Array.from(profiles.values());
  console.log(`Loaded ${profileList.length} analyzed profiles`);
  console.log('');

  // Load baseline matches
  console.log('Loading baseline matches...');
  const baselineMatches = await loadBaselineMatches();
  console.log(`Loaded ${baselineMatches.size} baseline matches`);
  console.log('');

  // Compute experimental matches
  console.log('Computing experimental matches...');
  const experimentalMatches: ExperimentalMatch[] = [];
  let computed = 0;
  const total = (profileList.length * (profileList.length - 1)) / 2;

  for (let i = 0; i < profileList.length; i++) {
    for (let j = i + 1; j < profileList.length; j++) {
      const profileA = profileList[i];
      const profileB = profileList[j];
      
      try {
        const result = compare(profileA, profileB);
        const key = [profileA.id, profileB.id].sort().join('_');
        const baseline = baselineMatches.get(key);
        const delta = baseline ? result.finalScore - baseline.finalScore : 0;

        experimentalMatches.push({
          aId: profileA.id,
          bId: profileB.id,
          aName: profileA.name || `#${profileA.id}`,
          bName: profileB.name || `#${profileB.id}`,
          finalScore: result.finalScore,
          compatibility: result.compatibility,
          friction: result.friction,
          coverage: result.coveragePercent,
          confidence: result.confidence,
          delta,
        });

        computed++;
        if (computed % 1000 === 0) {
          console.log(`  Computed ${computed}/${total} matches...`);
        }
      } catch (err) {
        // skip failed comparisons
      }
    }
  }

  console.log(`Computed ${experimentalMatches.length} experimental matches`);
  console.log('');

  // Statistics
  const scores = experimentalMatches.map(m => m.finalScore).sort((a, b) => a - b);
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const p50Score = percentile(scores, 50);
  const p90Score = percentile(scores, 90);
  const maxScore = Math.max(...scores);

  console.log('='.repeat(80));
  console.log('EXPERIMENTAL RESULTS');
  console.log('='.repeat(80));
  console.log('');
  console.log('Score distribution:');
  console.log(`  Average:    ${avgScore.toFixed(2)}`);
  console.log(`  Median:     ${p50Score}`);
  console.log(`  p90:        ${p90Score}`);
  console.log(`  Max:        ${maxScore}`);
  console.log('');

  // Compare to baseline
  if (baselineMatches.size > 0) {
    const baselineScores = Array.from(baselineMatches.values()).map(m => m.finalScore).sort((a, b) => a - b);
    const baselineAvg = baselineScores.reduce((s, v) => s + v, 0) / baselineScores.length;
    const baselineP50 = percentile(baselineScores, 50);
    const baselineP90 = percentile(baselineScores, 90);
    const baselineMax = Math.max(...baselineScores);

    console.log('Comparison to baseline:');
    console.log(`  Average:    ${avgScore.toFixed(2)} (baseline: ${baselineAvg.toFixed(2)}, delta: ${(avgScore - baselineAvg >= 0 ? '+' : '')}${(avgScore - baselineAvg).toFixed(2)})`);
    console.log(`  Median:     ${p50Score} (baseline: ${baselineP50}, delta: ${(p50Score - baselineP50 >= 0 ? '+' : '')}${p50Score - baselineP50})`);
    console.log(`  p90:        ${p90Score} (baseline: ${baselineP90}, delta: ${(p90Score - baselineP90 >= 0 ? '+' : '')}${p90Score - baselineP90})`);
    console.log(`  Max:        ${maxScore} (baseline: ${baselineMax}, delta: ${(maxScore - baselineMax >= 0 ? '+' : '')}${maxScore - baselineMax})`);
    console.log('');
  }

  // Top 20 matches
  console.log('='.repeat(80));
  console.log('TOP 20 EXPERIMENTAL MATCHES');
  console.log('='.repeat(80));
  console.log('');

  const sortedByScore = [...experimentalMatches].sort((a, b) => b.finalScore - a.finalScore);
  const top20 = sortedByScore.slice(0, 20);

  for (let i = 0; i < top20.length; i++) {
    const m = top20[i];
    const deltaStr = m.delta !== 0 ? ` (Δ${m.delta >= 0 ? '+' : ''}${m.delta})` : '';
    console.log(`${i + 1}. ${m.aName} ↔ ${m.bName}`);
    console.log(`   score: ${m.finalScore}${deltaStr}, compat: ${m.compatibility}, friction: ${m.friction}, coverage: ${Math.round(m.coverage)}%, confidence: ${(m.confidence * 100).toFixed(0)}%`);
    console.log('');
  }

  // Analyze deltas
  if (baselineMatches.size > 0) {
    console.log('='.repeat(80));
    console.log('DELTA ANALYSIS (vs Baseline)');
    console.log('='.repeat(80));
    console.log('');

    const matchesWithBaseline = experimentalMatches.filter(m => m.delta !== 0);
    const deltas = matchesWithBaseline.map(m => m.delta).sort((a, b) => a - b);
    const avgDelta = deltas.reduce((s, v) => s + v, 0) / deltas.length;
    const p50Delta = percentile(deltas, 50);
    const maxIncrease = Math.max(...deltas);
    const maxDecrease = Math.min(...deltas);

    console.log('Delta statistics:');
    console.log(`  Average delta:     ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(2)} points`);
    console.log(`  Median delta:      ${p50Delta >= 0 ? '+' : ''}${p50Delta} points`);
    console.log(`  Max increase:      +${maxIncrease} points`);
    console.log(`  Max decrease:      ${maxDecrease} points`);
    console.log('');

    // Biggest increases
    const biggestIncreases = [...matchesWithBaseline]
      .filter(m => m.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 10);

    console.log('Top 10 biggest increases (experimental > baseline):');
    console.log('');
    for (let i = 0; i < biggestIncreases.length; i++) {
      const m = biggestIncreases[i];
      const key = [m.aId, m.bId].sort().join('_');
      const baseline = baselineMatches.get(key);
      console.log(`${i + 1}. ${m.aName} ↔ ${m.bName}`);
      console.log(`   experimental: ${m.finalScore}, baseline: ${baseline?.finalScore || 'N/A'}, delta: +${m.delta}`);
      console.log(`   compat: ${m.compatibility}, friction: ${m.friction}, coverage: ${Math.round(m.coverage)}%`);
      console.log('');
    }

    // Biggest decreases (if any)
    const biggestDecreases = [...matchesWithBaseline]
      .filter(m => m.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 10);

    if (biggestDecreases.length > 0) {
      console.log('Top 10 biggest decreases (experimental < baseline):');
      console.log('');
      for (let i = 0; i < biggestDecreases.length; i++) {
        const m = biggestDecreases[i];
        const key = [m.aId, m.bId].sort().join('_');
        const baseline = baselineMatches.get(key);
        console.log(`${i + 1}. ${m.aName} ↔ ${m.bName}`);
        console.log(`   experimental: ${m.finalScore}, baseline: ${baseline?.finalScore || 'N/A'}, delta: ${m.delta}`);
        console.log(`   compat: ${m.compatibility}, friction: ${m.friction}, coverage: ${Math.round(m.coverage)}%`);
        console.log('');
      }
    }
  }

  // High-compatibility analysis
  console.log('='.repeat(80));
  console.log('HIGH-COMPATIBILITY ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  const highCompat = experimentalMatches.filter(m => m.compatibility >= 80);
  console.log(`Matches with compatibility ≥80: ${highCompat.length}`);
  if (highCompat.length > 0) {
    const highCompatScores = highCompat.map(m => m.finalScore).sort((a, b) => a - b);
    const avgHighCompat = highCompatScores.reduce((s, v) => s + v, 0) / highCompatScores.length;
    const p50HighCompat = percentile(highCompatScores, 50);
    const maxHighCompat = Math.max(...highCompatScores);
    
    console.log(`  Average score:  ${avgHighCompat.toFixed(2)}`);
    console.log(`  Median score:   ${p50HighCompat}`);
    console.log(`  Max score:      ${maxHighCompat}`);
    console.log('');

    const highCompatIn80s = highCompat.filter(m => m.finalScore >= 80 && m.finalScore < 90).length;
    const highCompatIn90s = highCompat.filter(m => m.finalScore >= 90).length;
    console.log(`  Scores 80-89:   ${highCompatIn80s} (${((highCompatIn80s / highCompat.length) * 100).toFixed(1)}%)`);
    console.log(`  Scores 90+:     ${highCompatIn90s} (${((highCompatIn90s / highCompat.length) * 100).toFixed(1)}%)`);
    console.log('');
  }

  // Verdict
  console.log('='.repeat(80));
  console.log('VERDICT');
  console.log('='.repeat(80));
  console.log('');

  const avgIncrease = baselineMatches.size > 0 ? avgScore - Array.from(baselineMatches.values()).reduce((s, m) => s + m.finalScore, 0) / baselineMatches.size : 0;
  
  console.log('Goal: Verify if high-compat matches rise to 80-90 without breaking distribution');
  console.log('');
  
  if (maxScore >= 90) {
    console.log('✗ CONCERN: Max score reached 90+ (distribution may be broken)');
  } else if (maxScore >= 85) {
    console.log('✓ POSITIVE: Max score in 85-89 range (healthy ceiling)');
  } else {
    console.log('⚠ NEUTRAL: Max score below 85 (may need adjustment)');
  }
  console.log('');

  if (highCompat.length > 0) {
    const highCompatIn80to90 = highCompat.filter(m => m.finalScore >= 80 && m.finalScore < 90).length;
    const pct = (highCompatIn80to90 / highCompat.length) * 100;
    if (pct >= 50) {
      console.log(`✓ SUCCESS: ${pct.toFixed(1)}% of high-compat matches (≥80 compatibility) score 80-89`);
    } else if (pct >= 25) {
      console.log(`⚠ PARTIAL: ${pct.toFixed(1)}% of high-compat matches score 80-89 (goal: >50%)`);
    } else {
      console.log(`✗ INSUFFICIENT: Only ${pct.toFixed(1)}% of high-compat matches score 80-89`);
    }
  }
  console.log('');

  if (avgIncrease > 0) {
    console.log(`Average score increased by ${avgIncrease.toFixed(2)} points`);
    if (avgIncrease > 10) {
      console.log('✗ CONCERN: Large increase may inflate distribution');
    } else if (avgIncrease > 5) {
      console.log('⚠ CAUTION: Moderate increase - verify distribution shape');
    } else {
      console.log('✓ ACCEPTABLE: Small increase maintains distribution');
    }
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('END OF EXPERIMENT');
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
