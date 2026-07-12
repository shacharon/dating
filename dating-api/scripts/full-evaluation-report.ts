/**
 * Full dataset evaluation report: comprehensive scoring analysis.
 * Generates score distribution, top/bottom/random samples with detailed breakdown.
 * 
 * Run: npx ts-node --transpile-only scripts/full-evaluation-report.ts
 * Or with output: npx ts-node --transpile-only scripts/full-evaluation-report.ts > docs/full-evaluation-report.txt
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveEngineFinalScore } from '../src/matches/match-score.util';

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

interface ProfileData {
  id: string;
  name?: string;
}

interface MatchSample {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  finalScore: number;
  compatibility: number;
  friction: number;
  coverage: number;
  reason: string;
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
          finalScore: resolveEngineFinalScore(parsed),
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
        const parsed = JSON.parse(raw) as ProfileData;
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

function getTier(match: MatchRecord): string {
  return match.balance?.tier ?? match.debug?.tier ?? 'UNKNOWN';
}

function getDealbreakers(match: MatchRecord): Array<{ code: string; severity: string }> {
  return match.dealbreakers ?? match.debug?.dealbreakers ?? [];
}

function generateReason(match: MatchRecord): string {
  const tier = getTier(match);
  const dealbreakers = getDealbreakers(match);
  const coverage = match.coveragePercent;
  const friction = match.friction;
  const compat = match.compatibility;

  const parts: string[] = [];

  // Compatibility level
  if (compat >= 90) parts.push('exceptional compatibility');
  else if (compat >= 85) parts.push('very high compatibility');
  else if (compat >= 80) parts.push('high compatibility');
  else if (compat >= 75) parts.push('good compatibility');
  else if (compat >= 70) parts.push('moderate compatibility');
  else if (compat >= 60) parts.push('fair compatibility');
  else parts.push('low compatibility');

  // Friction
  if (friction >= 5) parts.push('high friction');
  else if (friction >= 3) parts.push('moderate friction');
  else if (friction >= 1) parts.push('minor friction');

  // Coverage
  if (coverage < 50) parts.push('sparse data');
  else if (coverage < 65) parts.push('limited coverage');

  // Tier
  if (tier === 'GREEN') parts.push('balanced dynamic');
  else if (tier === 'RED') parts.push('imbalanced dynamic');
  else if (tier === 'YELLOW') parts.push('asymmetric dynamic');

  // Dealbreakers
  if (dealbreakers.length > 0) {
    const codes = dealbreakers.map(d => d.code).join(', ');
    parts.push(`dealbreakers: ${codes}`);
  }

  return parts.join('; ');
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function formatMatchSample(sample: MatchSample, index: number): string {
  return [
    `${index}. ${sample.aName} ↔ ${sample.bName}`,
    `   finalScore: ${sample.finalScore}, compatibility: ${sample.compatibility}, friction: ${sample.friction}, coverage: ${sample.coverage}%`,
    `   reason: ${sample.reason}`,
  ].join('\n');
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('FULL DATASET EVALUATION REPORT');
  console.log('='.repeat(80));
  console.log('');

  // Load data
  console.log('Loading matches and profiles...');
  const matches = await loadAllMatches();
  const nameMap = await loadProfileNames();

  if (matches.length === 0) {
    console.log('No matches found. Run recompute-matches first.');
    process.exit(0);
  }

  console.log(`Loaded ${matches.length} matches`);
  console.log('');

  // Calculate statistics
  const scores = matches.map(m => m.finalScore).sort((a, b) => a - b);
  const sum = scores.reduce((acc, s) => acc + s, 0);
  const avg = sum / scores.length;
  const p50 = percentile(scores, 50);
  const p90 = percentile(scores, 90);
  const p95 = percentile(scores, 95);
  const max = scores[scores.length - 1];
  const min = scores[0];

  // Score distribution
  console.log('='.repeat(80));
  console.log('SCORE DISTRIBUTION');
  console.log('='.repeat(80));
  console.log(`Total matches: ${matches.length}`);
  console.log(`Average:       ${avg.toFixed(2)}`);
  console.log(`Median (p50):  ${p50}`);
  console.log(`p90:           ${p90}`);
  console.log(`p95:           ${p95}`);
  console.log(`Max:           ${max}`);
  console.log(`Min:           ${min}`);
  console.log('');

  // Histogram
  const bins = [0, 20, 40, 50, 60, 70, 75, 80, 85, 90, 95, 100];
  const binCounts = new Array(bins.length).fill(0);
  for (const score of scores) {
    for (let i = bins.length - 1; i >= 0; i--) {
      if (score >= bins[i]) {
        binCounts[i]++;
        break;
      }
    }
  }

  console.log('Score distribution by range:');
  for (let i = 0; i < bins.length; i++) {
    const nextBin = i < bins.length - 1 ? bins[i + 1] : 101;
    const range = `${bins[i]}-${nextBin - 1}`;
    const count = binCounts[i];
    const pct = ((count / matches.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((count / matches.length) * 50));
    console.log(`  ${range.padEnd(8)} ${String(count).padStart(5)} (${pct.padStart(5)}%) ${bar}`);
  }
  console.log('');

  // Top 20 matches
  console.log('='.repeat(80));
  console.log('TOP 20 MATCHES (Highest Scores)');
  console.log('='.repeat(80));
  console.log('');

  const sortedDesc = [...matches].sort((a, b) => b.finalScore - a.finalScore);
  const top20 = sortedDesc.slice(0, 20);

  for (let i = 0; i < top20.length; i++) {
    const m = top20[i];
    const sample: MatchSample = {
      aId: m.aId,
      bId: m.bId,
      aName: getProfileName(m.aId, nameMap, m.a?.name),
      bName: getProfileName(m.bId, nameMap, m.b?.name),
      finalScore: m.finalScore,
      compatibility: m.compatibility,
      friction: m.friction,
      coverage: Math.round(m.coveragePercent),
      reason: generateReason(m),
    };
    console.log(formatMatchSample(sample, i + 1));
    console.log('');
  }

  // Bottom 20 matches
  console.log('='.repeat(80));
  console.log('BOTTOM 20 MATCHES (Lowest Scores)');
  console.log('='.repeat(80));
  console.log('');

  const sortedAsc = [...matches].sort((a, b) => a.finalScore - b.finalScore);
  const bottom20 = sortedAsc.slice(0, 20);

  for (let i = 0; i < bottom20.length; i++) {
    const m = bottom20[i];
    const sample: MatchSample = {
      aId: m.aId,
      bId: m.bId,
      aName: getProfileName(m.aId, nameMap, m.a?.name),
      bName: getProfileName(m.bId, nameMap, m.b?.name),
      finalScore: m.finalScore,
      compatibility: m.compatibility,
      friction: m.friction,
      coverage: Math.round(m.coveragePercent),
      reason: generateReason(m),
    };
    console.log(formatMatchSample(sample, i + 1));
    console.log('');
  }

  // Random 10 matches
  console.log('='.repeat(80));
  console.log('RANDOM 10 MATCHES (Representative Sample)');
  console.log('='.repeat(80));
  console.log('');

  // Deterministic random sampling - pick from different score ranges
  const randomSamples: MatchRecord[] = [];
  const ranges = [
    { min: 0, max: 40 },
    { min: 40, max: 50 },
    { min: 50, max: 60 },
    { min: 60, max: 70 },
    { min: 70, max: 80 },
    { min: 80, max: 100 },
  ];

  for (const range of ranges) {
    const inRange = matches.filter(m => m.finalScore >= range.min && m.finalScore < range.max);
    if (inRange.length > 0) {
      // Pick one from this range
      const idx = Math.floor(inRange.length / 2); // middle of range
      randomSamples.push(inRange[idx]);
    }
  }

  // Add a few more from the median range
  const medianRange = matches.filter(m => m.finalScore >= 45 && m.finalScore <= 55);
  if (medianRange.length >= 4) {
    randomSamples.push(medianRange[Math.floor(medianRange.length * 0.25)]);
    randomSamples.push(medianRange[Math.floor(medianRange.length * 0.5)]);
    randomSamples.push(medianRange[Math.floor(medianRange.length * 0.75)]);
  }

  // Trim to 10
  const finalRandomSamples = randomSamples.slice(0, 10);

  for (let i = 0; i < finalRandomSamples.length; i++) {
    const m = finalRandomSamples[i];
    const sample: MatchSample = {
      aId: m.aId,
      bId: m.bId,
      aName: getProfileName(m.aId, nameMap, m.a?.name),
      bName: getProfileName(m.bId, nameMap, m.b?.name),
      finalScore: m.finalScore,
      compatibility: m.compatibility,
      friction: m.friction,
      coverage: Math.round(m.coveragePercent),
      reason: generateReason(m),
    };
    console.log(formatMatchSample(sample, i + 1));
    console.log('');
  }

  // Pattern analysis
  console.log('='.repeat(80));
  console.log('PATTERN ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  // Analyze patterns
  const highScoreMatches = matches.filter(m => m.finalScore >= 85);
  const lowScoreMatches = matches.filter(m => m.finalScore <= 60);
  const mediumScoreMatches = matches.filter(m => m.finalScore >= 70 && m.finalScore <= 80);

  // Tier distribution
  const tierCounts = { GREEN: 0, YELLOW: 0, RED: 0, UNKNOWN: 0 };
  for (const m of matches) {
    const tier = getTier(m);
    if (tier === 'GREEN' || tier === 'YELLOW' || tier === 'RED') {
      tierCounts[tier]++;
    } else {
      tierCounts.UNKNOWN++;
    }
  }

  // Coverage analysis
  const lowCoverage = matches.filter(m => m.coveragePercent < 50).length;
  const mediumCoverage = matches.filter(m => m.coveragePercent >= 50 && m.coveragePercent < 70).length;
  const highCoverage = matches.filter(m => m.coveragePercent >= 70).length;

  // Friction analysis
  const highFriction = matches.filter(m => m.friction >= 5).length;
  const mediumFriction = matches.filter(m => m.friction >= 2 && m.friction < 5).length;
  const lowFriction = matches.filter(m => m.friction < 2).length;

  // Dealbreaker analysis
  const withDealbreakers = matches.filter(m => getDealbreakers(m).length > 0).length;
  const withoutDealbreakers = matches.length - withDealbreakers;

  console.log('✓ STRONGEST PATTERNS (Look Correct):');
  console.log('');

  // Pattern 1: High compatibility + low friction = high scores
  const highCompatLowFric = matches.filter(m => m.compatibility >= 85 && m.friction <= 2);
  const avgScoreHighCompatLowFric = highCompatLowFric.length > 0 
    ? (highCompatLowFric.reduce((sum, m) => sum + m.finalScore, 0) / highCompatLowFric.length).toFixed(1)
    : 'N/A';
  console.log(`1. High compatibility (≥85) + low friction (≤2) → high scores`);
  console.log(`   ${highCompatLowFric.length} matches (${((highCompatLowFric.length / matches.length) * 100).toFixed(1)}%)`);
  console.log(`   Average finalScore: ${avgScoreHighCompatLowFric}`);
  console.log('');

  // Pattern 2: Balanced relationships (GREEN tier) get score boost
  const greenTier = matches.filter(m => getTier(m) === 'GREEN');
  const avgScoreGreen = greenTier.length > 0
    ? (greenTier.reduce((sum, m) => sum + m.finalScore, 0) / greenTier.length).toFixed(1)
    : 'N/A';
  const avgCompatGreen = greenTier.length > 0
    ? (greenTier.reduce((sum, m) => sum + m.compatibility, 0) / greenTier.length).toFixed(1)
    : 'N/A';
  console.log(`2. GREEN tier (balanced relationships) consistently score higher`);
  console.log(`   ${greenTier.length} matches (${((greenTier.length / matches.length) * 100).toFixed(1)}%)`);
  console.log(`   Average finalScore: ${avgScoreGreen}, average compatibility: ${avgCompatGreen}`);
  console.log('');

  // Pattern 3: Coverage strongly affects score reliability
  const highCoverageMatches = matches.filter(m => m.coveragePercent >= 70);
  const lowCoverageMatches = matches.filter(m => m.coveragePercent < 50);
  const avgScoreHighCov = highCoverageMatches.length > 0
    ? (highCoverageMatches.reduce((sum, m) => sum + m.finalScore, 0) / highCoverageMatches.length).toFixed(1)
    : 'N/A';
  const avgScoreLowCov = lowCoverageMatches.length > 0
    ? (lowCoverageMatches.reduce((sum, m) => sum + m.finalScore, 0) / lowCoverageMatches.length).toFixed(1)
    : 'N/A';
  console.log(`3. Coverage strongly affects scores (calibration working)`);
  console.log(`   High coverage (≥70%): ${highCoverageMatches.length} matches, avg score: ${avgScoreHighCov}`);
  console.log(`   Low coverage (<50%): ${lowCoverageMatches.length} matches, avg score: ${avgScoreLowCov}`);
  console.log('');

  console.log('✗ BIGGEST CONCERNS (Look Wrong):');
  console.log('');

  // Concern 1: RED tier imbalance penalty might be too harsh
  const redTier = matches.filter(m => getTier(m) === 'RED');
  const avgScoreRed = redTier.length > 0
    ? (redTier.reduce((sum, m) => sum + m.finalScore, 0) / redTier.length).toFixed(1)
    : 'N/A';
  const avgCompatRed = redTier.length > 0
    ? (redTier.reduce((sum, m) => sum + m.compatibility, 0) / redTier.length).toFixed(1)
    : 'N/A';
  const redWithHighCompat = redTier.filter(m => m.compatibility >= 80).length;
  console.log(`1. RED tier penalty may be too harsh for high-compatibility pairs`);
  console.log(`   ${redTier.length} RED matches (${((redTier.length / matches.length) * 100).toFixed(1)}%)`);
  console.log(`   Average finalScore: ${avgScoreRed}, average compatibility: ${avgCompatRed}`);
  console.log(`   ${redWithHighCompat} RED matches have compatibility ≥80 but still score low`);
  console.log('');

  // Concern 2: Friction penalty scaling
  const highFrictionMatches = matches.filter(m => m.friction >= 5);
  const avgScoreHighFric = highFrictionMatches.length > 0
    ? (highFrictionMatches.reduce((sum, m) => sum + m.finalScore, 0) / highFrictionMatches.length).toFixed(1)
    : 'N/A';
  const highFricHighCompat = highFrictionMatches.filter(m => m.compatibility >= 80).length;
  console.log(`2. High friction (≥5) severely penalizes even compatible pairs`);
  console.log(`   ${highFrictionMatches.length} matches with friction ≥5 (${((highFrictionMatches.length / matches.length) * 100).toFixed(1)}%)`);
  console.log(`   Average finalScore: ${avgScoreHighFric}`);
  console.log(`   ${highFricHighCompat} have compatibility ≥80 but friction drags score down`);
  console.log('');

  // Concern 3: Sparse data calibration might be too aggressive
  const sparseMatches = matches.filter(m => m.coveragePercent < 50);
  const sparseWithGoodCompat = sparseMatches.filter(m => m.compatibility >= 75);
  const avgScoreSparseGoodCompat = sparseWithGoodCompat.length > 0
    ? (sparseWithGoodCompat.reduce((sum, m) => sum + m.finalScore, 0) / sparseWithGoodCompat.length).toFixed(1)
    : 'N/A';
  console.log(`3. Sparse data calibration (<50% coverage) may over-penalize`);
  console.log(`   ${sparseMatches.length} matches with coverage <50% (${((sparseMatches.length / matches.length) * 100).toFixed(1)}%)`);
  console.log(`   ${sparseWithGoodCompat.length} sparse matches have compatibility ≥75 but avg score: ${avgScoreSparseGoodCompat}`);
  console.log(`   Calibration might be too conservative for limited but quality data`);
  console.log('');

  console.log('='.repeat(80));
  console.log('END OF REPORT');
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
