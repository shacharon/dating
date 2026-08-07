/**
 * Phase 1 EQ gate — runs Expansion-01/02/03 live LLM validators and prints summary.
 *
 * Run: npm run validate:phase1-eq-extraction
 * Exit 0 without OPENAI_API_KEY; exit 1 if any signal below 85% when key present.
 */

import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExtractionService } from '../src/extraction/extraction.service';
import {
  AGREEMENT_THRESHOLD,
  loadFixtures,
  validateFixtureFile,
  type SignalValidationResult,
} from './expansion-extraction-validation';

dotenv.config();

const SUITES = [
  { sprint: '01', file: 'expansion-01-extraction-fixtures.json' },
  { sprint: '02', file: 'expansion-02-extraction-fixtures.json' },
  { sprint: '03', file: 'expansion-03-extraction-fixtures.json' },
] as const;

function formatPass(pass: boolean): string {
  return pass ? 'PASS' : 'FAIL';
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log('SKIP: no OPENAI_API_KEY');
    process.exit(0);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const extraction = app.get(ExtractionService);

  const allResults: SignalValidationResult[] = [];

  for (const suite of SUITES) {
    console.log(`\n=== Expansion-${suite.sprint} ===`);
    const fixtures = await loadFixtures(suite.file);
    const results = await validateFixtureFile(
      extraction,
      fixtures,
      suite.sprint,
      true,
    );
    allResults.push(...results);
  }

  await app.close();

  console.log('\n=== Phase 1 EQ extraction summary ===');
  console.log('Signal | Sprint | Agreement | Pass');
  console.log('-------|--------|-----------|-----');
  for (const row of allResults) {
    const pct = (row.agreement * 100).toFixed(1);
    console.log(
      `${row.signal} | ${row.sprint} | ${pct}% (${row.passes}/${row.scored}) | ${formatPass(row.pass)}`,
    );
  }

  const anyFail = allResults.some((r) => !r.pass);
  const overallPasses = allResults.reduce((n, r) => n + r.passes, 0);
  const overallScored = allResults.reduce((n, r) => n + r.scored, 0);
  const overallAgreement =
    overallScored === 0 ? 0 : overallPasses / overallScored;
  console.log(
    `\nOverall: ${(overallAgreement * 100).toFixed(1)}% (${overallPasses}/${overallScored}) — threshold ${AGREEMENT_THRESHOLD * 100}%`,
  );

  if (anyFail) {
    console.error('Phase 1 gate: one or more signals below threshold');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
