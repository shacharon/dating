/**
 * CI guard: HG ranking must use real five-signal data, not deterministicSpread fallback.
 *
 * 1) Runs `hg-full-system-validation.ts` (writes scripts/.hg-full-system-validation-output.json).
 * 2) Enforces thresholds on that JSON.
 *
 * Requires DATABASE_URL and the HG synthetic validation pool present in DB (same as full validation).
 *
 * Run: npx ts-node scripts/hg-ranking-signal-ci-guard.ts
 *      npm run ci:hg-ranking-guard
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const CI_GUARD_ACTIVE = true;

const API_ROOT = path.join(__dirname, '..');
const OUTPUT_JSON = path.join(__dirname, '.hg-full-system-validation-output.json');

const MAX_DETERMINISTIC_SPREAD_PCT = 5;
const MIN_SIGNAL_COVERAGE_PCT = 80;

type ValidationReport = {
  ranking?: {
    totalRankedRows?: number;
    deterministicSpreadPctOfRankedRows?: number | null;
    deterministicSpreadRows?: number;
  };
  signal_quality?: {
    profileObservations?: number;
    pctAtLeastOne?: {
      dailyRhythm?: number | null;
      autonomyTogetherness?: number | null;
      conflictStyle?: number | null;
      lifestylePace?: number | null;
    };
    countsAtLeastOne?: {
      hasDaily?: number;
      hasAuto?: number;
      hasConflict?: number;
      hasPace?: number;
    };
  };
};

function pctOrCompute(
  report: ValidationReport,
  key: 'dailyRhythm' | 'autonomyTogetherness' | 'conflictStyle' | 'lifestylePace',
  countKey: 'hasDaily' | 'hasAuto' | 'hasConflict' | 'hasPace',
): number | null {
  const direct = report.signal_quality?.pctAtLeastOne?.[key];
  if (direct != null && Number.isFinite(direct)) return direct;
  const total = report.signal_quality?.profileObservations ?? 0;
  const c = report.signal_quality?.countsAtLeastOne?.[countKey] ?? 0;
  if (total <= 0) return null;
  return Math.round((1e4 * c) / total) / 100;
}

function main(): void {
  execSync('npx ts-node scripts/hg-full-system-validation.ts', {
    cwd: API_ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  const raw = fs.readFileSync(OUTPUT_JSON, 'utf8');
  const report = JSON.parse(raw) as ValidationReport;

  const lines: string[] = [];
  let failed = false;

  const obs = report.signal_quality?.profileObservations ?? 0;
  if (obs <= 0) {
    failed = true;
    lines.push('No profile observations (profileObservations=0). HG validation pool missing or DB unreachable.');
  }

  const ranked = report.ranking?.totalRankedRows ?? 0;
  if (ranked <= 0 && obs > 0) {
    failed = true;
    lines.push('No ranked rows (totalRankedRows=0); cannot verify deterministicSpread guard.');
  }

  const spreadPct = report.ranking?.deterministicSpreadPctOfRankedRows;
  if (ranked > 0) {
    if (spreadPct == null || !Number.isFinite(spreadPct)) {
      failed = true;
      lines.push('deterministicSpreadPctOfRankedRows: missing or non-finite (report bug).');
    } else {
      lines.push(
        `deterministicSpreadPctOfRankedRows: ${spreadPct}% (threshold: <= ${MAX_DETERMINISTIC_SPREAD_PCT}%)`,
      );
      if (spreadPct > MAX_DETERMINISTIC_SPREAD_PCT) {
        failed = true;
      }
    }
  }

  const coverageLabels = [
    { label: 'dailyRhythm', countKey: 'hasDaily' as const, pctKey: 'dailyRhythm' as const },
    { label: 'autonomyTogetherness', countKey: 'hasAuto' as const, pctKey: 'autonomyTogetherness' as const },
    { label: 'conflictStyle', countKey: 'hasConflict' as const, pctKey: 'conflictStyle' as const },
    { label: 'lifestylePace', countKey: 'hasPace' as const, pctKey: 'lifestylePace' as const },
  ];

  const dropped: string[] = [];
  lines.push('Signal coverage (% of profile observations with value):');

  for (const { label, countKey, pctKey } of coverageLabels) {
    const p = pctOrCompute(report, pctKey, countKey);
    const pctStr = p == null ? 'n/a' : `${p}%`;
    lines.push(`  ${label}: ${pctStr} (threshold: >= ${MIN_SIGNAL_COVERAGE_PCT}%)`);
    if (obs > 0 && p != null && p < MIN_SIGNAL_COVERAGE_PCT) {
      failed = true;
      dropped.push(label);
    }
    if (obs > 0 && p == null) {
      failed = true;
      dropped.push(label);
    }
  }

  if (failed) {
    console.error('\n======== HG RANKING SIGNAL CI GUARD FAILED ========');
    for (const line of lines) console.error(line);
    if (dropped.length > 0) {
      console.error(`\nSignals below ${MIN_SIGNAL_COVERAGE_PCT}% coverage or missing: ${dropped.join(', ')}`);
    }
    console.error('\nranking pipeline regression suspected');
    console.error('===================================================\n');
    process.exit(1);
  }

  for (const line of lines) console.log(line);
  console.log('\nCI_GUARD_ACTIVE = TRUE');
}

main();
