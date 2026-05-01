/**
 * Analyze SIGNAL3 shadow signals extraction quality.
 * Computes non-null rates, distributions, evidence examples, and overlap analysis.
 * 
 * Run: npx ts-node scripts/analyze-signal3.ts
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LegacyBackendAdapter } from '../src/legacy/legacy-backend.adapter';

const ROOT = process.cwd();
const COHORT_PATH = join(ROOT, 'data', 'pilot-cohort.json');

const SIGNAL3_KEYS = ['conflictStyle', 'noveltyVsRoutine', 'structureChaosTolerance'] as const;
type Signal3Key = typeof SIGNAL3_KEYS[number];

interface SignalStats {
  signal: Signal3Key;
  nonNullCount: number;
  totalSlots: number;
  nonNullRate: number;
  avgValue: number | null;
  distribution: {
    low: number;    // 1-3
    mid: number;    // 4-7
    high: number;   // 8-10
  };
  examples: Array<{
    profileId: string;
    domain: string;
    value: number;
    quote: string;
  }>;
}

interface OverlapAnalysis {
  signal1: string;
  signal2: string;
  bothNonNull: number;
  totalPairs: number;
  overlapRate: number;
  correlationSign: 'positive' | 'negative' | 'mixed' | 'unknown';
  examples: Array<{
    profileId: string;
    domain: string;
    signal1Value: number;
    signal2Value: number;
    note: string;
  }>;
}

async function main(): Promise<void> {
  let cohortIds: string[];
  try {
    const raw = await readFile(COHORT_PATH, 'utf8');
    cohortIds = JSON.parse(raw) as string[];
  } catch (err) {
    console.error('Failed to read cohort:', COHORT_PATH, err);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const profilesJson = app.get(LegacyBackendAdapter).profilesJson;

  console.log(`\n=== SIGNAL3 Validation Report ===`);
  console.log(`Cohort: ${cohortIds.length} profiles\n`);

  // Collect all signal values across all domains
  const signalData: Record<Signal3Key, Array<{ profileId: string; domain: string; value: number; quote: string }>> = {
    conflictStyle: [],
    noveltyVsRoutine: [],
    structureChaosTolerance: [],
  };

  const overlapData: Array<{
    profileId: string;
    domain: string;
    conflictStyle: number | null;
    directness: number | null;
    noveltyVsRoutine: number | null;
    lifestylePace: number | null;
    structureChaosTolerance: number | null;
  }> = [];

  for (const id of cohortIds) {
    const profile = await profilesJson.getById(id);
    if (!profile?.evaluation) continue;

    for (const domain of ['self', 'partner', 'relationship'] as const) {
      const extracted = profile.evaluation[domain];
      if (!extracted?.signals) continue;

      const signals = extracted.signals as Record<string, number | null>;
      const evidence = extracted.evidence || [];

      // Collect SIGNAL3 data
      for (const key of SIGNAL3_KEYS) {
        const value = signals[key];
        if (value != null) {
          const evidenceItem = evidence.find((e: any) => e.signal === key);
          signalData[key].push({
            profileId: id,
            domain,
            value,
            quote: evidenceItem?.quote || '(no evidence)',
          });
        }
      }

      // Collect overlap data
      overlapData.push({
        profileId: id,
        domain,
        conflictStyle: signals.conflictStyle ?? null,
        directness: signals.directness ?? null,
        noveltyVsRoutine: signals.noveltyVsRoutine ?? null,
        lifestylePace: signals.lifestylePace ?? null,
        structureChaosTolerance: signals.structureChaosTolerance ?? null,
      });
    }
  }

  const totalSlots = cohortIds.length * 3; // 3 domains per profile

  // Compute stats for each signal
  const stats: SignalStats[] = [];
  for (const key of SIGNAL3_KEYS) {
    const data = signalData[key];
    const nonNullCount = data.length;
    const nonNullRate = (nonNullCount / totalSlots) * 100;

    let sumValues = 0;
    let low = 0, mid = 0, high = 0;
    for (const item of data) {
      sumValues += item.value;
      if (item.value >= 1 && item.value <= 3) low++;
      else if (item.value >= 4 && item.value <= 7) mid++;
      else if (item.value >= 8 && item.value <= 10) high++;
    }

    const avgValue = nonNullCount > 0 ? sumValues / nonNullCount : null;

    // Get 5-8 examples (diverse values)
    const examples = data
      .sort((a, b) => b.value - a.value) // sort by value descending
      .slice(0, 8);

    stats.push({
      signal: key,
      nonNullCount,
      totalSlots,
      nonNullRate,
      avgValue,
      distribution: { low, mid, high },
      examples,
    });
  }

  // Print stats
  for (const stat of stats) {
    console.log(`\n## ${stat.signal}`);
    console.log(`Non-null rate: ${stat.nonNullCount}/${stat.totalSlots} (${stat.nonNullRate.toFixed(1)}%)`);
    console.log(`Average value: ${stat.avgValue?.toFixed(1) ?? 'N/A'}`);
    console.log(`Distribution: 1-3 (${stat.distribution.low}), 4-7 (${stat.distribution.mid}), 8-10 (${stat.distribution.high})`);
    console.log(`\nEvidence examples:`);
    for (const ex of stat.examples) {
      console.log(`  - ${ex.profileId} (${ex.domain}, value=${ex.value}): "${ex.quote.slice(0, 80)}${ex.quote.length > 80 ? '...' : ''}"`);
    }
  }

  // Overlap analysis
  console.log(`\n\n=== Overlap Analysis ===\n`);

  const overlaps: OverlapAnalysis[] = [
    analyzeOverlap(overlapData, 'conflictStyle', 'directness'),
    analyzeOverlap(overlapData, 'noveltyVsRoutine', 'lifestylePace'),
    analyzeOverlap(overlapData, 'structureChaosTolerance', 'lifestylePace'),
  ];

  for (const overlap of overlaps) {
    console.log(`\n## ${overlap.signal1} vs ${overlap.signal2}`);
    console.log(`Both non-null: ${overlap.bothNonNull}/${overlap.totalPairs} (${overlap.overlapRate.toFixed(1)}%)`);
    console.log(`Correlation: ${overlap.correlationSign}`);
    console.log(`\nExamples:`);
    for (const ex of overlap.examples.slice(0, 5)) {
      console.log(`  - ${ex.profileId} (${ex.domain}): ${overlap.signal1}=${ex.signal1Value}, ${overlap.signal2}=${ex.signal2Value} — ${ex.note}`);
    }
  }

  // Recommendations
  console.log(`\n\n=== Recommendations ===\n`);

  for (const stat of stats) {
    let recommendation = 'KEEP';
    let reason = 'Good extraction quality';

    if (stat.nonNullRate < 10) {
      recommendation = 'DROP';
      reason = 'Under-triggering (< 10% non-null)';
    } else if (stat.nonNullRate > 70) {
      recommendation = 'TUNE';
      reason = 'Over-triggering (> 70% non-null)';
    } else if (stat.avgValue && (stat.avgValue < 3 || stat.avgValue > 8)) {
      recommendation = 'TUNE';
      reason = `Skewed distribution (avg=${stat.avgValue.toFixed(1)})`;
    } else if (stat.distribution.mid < stat.nonNullCount * 0.3) {
      recommendation = 'TUNE';
      reason = 'Polarized distribution (low mid-range values)';
    }

    console.log(`${stat.signal}: ${recommendation} — ${reason}`);
  }

  console.log(`\n✅ Analysis complete.\n`);
  await app.close();
}

function analyzeOverlap(
  data: Array<{
    profileId: string;
    domain: string;
    [key: string]: any;
  }>,
  signal1: string,
  signal2: string,
): OverlapAnalysis {
  let bothNonNull = 0;
  const examples: OverlapAnalysis['examples'] = [];

  for (const item of data) {
    const v1 = item[signal1];
    const v2 = item[signal2];
    if (v1 != null && v2 != null) {
      bothNonNull++;
      const diff = Math.abs(v1 - v2);
      let note = '';
      if (diff <= 2) note = 'Similar values (low diff)';
      else if (diff >= 5) note = 'Different values (high diff)';
      else note = 'Moderate difference';

      if (examples.length < 10) {
        examples.push({
          profileId: item.profileId,
          domain: item.domain,
          signal1Value: v1,
          signal2Value: v2,
          note,
        });
      }
    }
  }

  const totalPairs = data.length;
  const overlapRate = (bothNonNull / totalPairs) * 100;

  // Determine correlation sign (simple heuristic)
  let correlationSign: OverlapAnalysis['correlationSign'] = 'unknown';
  if (bothNonNull > 5) {
    const similar = examples.filter(e => e.note.includes('Similar')).length;
    const different = examples.filter(e => e.note.includes('Different')).length;
    if (similar > different * 2) correlationSign = 'positive';
    else if (different > similar * 2) correlationSign = 'negative';
    else correlationSign = 'mixed';
  }

  return {
    signal1,
    signal2,
    bothNonNull,
    totalPairs,
    overlapRate,
    correlationSign,
    examples,
  };
}

main().catch(console.error);
