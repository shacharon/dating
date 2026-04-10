/**
 * One-shot DB report: synthetic lifestyle v2 validation (if pool present) + real-profile batch analysis.
 *
 * Requires DATABASE_URL (e.g. via .env). Writes scripts/.lifestyle-v2-db-report.json
 *
 * Run: npm run lifestyle-v2:db-report
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.join(__dirname, '..');
const VAL_JSON = path.join(__dirname, '.lifestyle-v2-validation-output.json');
const BATCH_JSON = path.join(__dirname, '.v1-signal-families-batch-output.json');
const OUT_JSON = path.join(__dirname, '.lifestyle-v2-db-report.json');

function main(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required');
  }

  let syntheticValidation: unknown;
  try {
    execSync('npx ts-node scripts/validate-lifestyle-signals-v2.ts', {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    syntheticValidation = JSON.parse(fs.readFileSync(VAL_JSON, 'utf8'));
  } catch {
    syntheticValidation = {
      skipped: true,
      hint: 'Synthetic pool missing or validation failed. Run: npm run seed:lifestyle-v2-validation && npm run validate:lifestyle-v2',
    };
  }

  execSync('npx ts-node scripts/v1-signal-families-batch-analysis.ts', {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  const batch = JSON.parse(fs.readFileSync(BATCH_JSON, 'utf8')) as Record<string, unknown>;

  const lifestyleAnalytics = batch.lifestyleAnalytics as Record<string, unknown> | undefined;
  const ranking = batch.ranking as Record<string, unknown> | undefined;

  const summary = {
    generatedAt: new Date().toISOString(),
    syntheticValidation,
    realProfileBatch: {
      totalProfiles: (batch.coverageTable as Record<string, unknown> | undefined)?.totalProfiles,
      pctAtLeastOneTag_lifestyleSignals: (batch.coverageTable as Record<string, unknown> | undefined)
        ?.pctAtLeastOneTag_lifestyleSignals,
      lifestyleTopTags: (lifestyleAnalytics?.topTagsMergedSelfPlusPartner as unknown[])?.slice(0, 12),
      lifestyleV1Occurrences: lifestyleAnalytics?.v1TotalTagOccurrences,
      lifestyleV2Occurrences: lifestyleAnalytics?.v2TotalTagOccurrences,
      groundedPairStats: lifestyleAnalytics?.groundedPairStats,
      rankDelta_lifestyleStripOnly: ranking?.lifestyleStripOnly,
      rankDelta_allFreeTextFamiliesStrip: ranking?.allFreeTextTagFamiliesStrip,
    },
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
  // eslint-disable-next-line no-console
  console.error(`\nWrote ${OUT_JSON}`);
}

main();
