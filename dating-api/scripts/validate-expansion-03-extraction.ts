/**
 * Optional live LLM validation for Expansion-03 shadow signal.
 * Compares self-domain extraction against curated fixture bands.
 *
 * Run: npm run validate:expansion-03-extraction
 * Requires OPENAI_API_KEY for live validation; skips gracefully otherwise.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExtractionService } from '../src/extraction/extraction.service';

dotenv.config();

const ROOT = process.cwd();
const FIXTURES_PATH = join(ROOT, 'data', 'expansion-03-extraction-fixtures.json');
const AGREEMENT_THRESHOLD = 0.85;

interface Expansion03Fixture {
  id: string;
  aboutMe: string;
  signal: 'humorPlayfulness';
  expectedMin: number;
  expectedMax: number;
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log('SKIP: no OPENAI_API_KEY');
    process.exit(0);
  }

  const raw = await readFile(FIXTURES_PATH, 'utf8');
  const fixtures = JSON.parse(raw) as Expansion03Fixture[];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const extraction = app.get(ExtractionService);

  let passes = 0;
  let scored = 0;

  for (const fixture of fixtures) {
    const extracted = await extraction.extract('self', fixture.aboutMe, fixture.id);
    const score = extracted.signals[fixture.signal] ?? null;
    if (score == null) {
      console.log(
        `FAIL ${fixture.id}: null (expected ${fixture.expectedMin}-${fixture.expectedMax})`,
      );
      continue;
    }
    scored += 1;
    const ok = score >= fixture.expectedMin && score <= fixture.expectedMax;
    if (ok) {
      passes += 1;
      console.log(`PASS ${fixture.id}: ${fixture.signal}=${score}`);
    } else {
      console.log(
        `FAIL ${fixture.id}: ${fixture.signal}=${score} (expected ${fixture.expectedMin}-${fixture.expectedMax})`,
      );
    }
  }

  await app.close();

  const agreement = scored === 0 ? 0 : passes / scored;
  console.log(
    `\nExpansion-03 extraction agreement: ${(agreement * 100).toFixed(1)}% (${passes}/${scored} scored fixtures)`,
  );

  if (agreement < AGREEMENT_THRESHOLD) {
    console.error(`Below threshold ${AGREEMENT_THRESHOLD * 100}%`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
