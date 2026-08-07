/**
 * Optional live LLM validation for Expansion-11 shadow signals.
 * Compares self-domain extraction against curated fixture bands
 * (EN high/low/null + Hebrew + distinction cases).
 *
 * Run: npm run validate:expansion-11-extraction
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
const FIXTURES_PATH = join(ROOT, 'data', 'expansion-11-extraction-fixtures.json');
const AGREEMENT_THRESHOLD = 0.85;

type Expansion11ShadowKey = 'stressResponse' | 'jealousySecurity';

interface Expansion11Expectation {
  signal: Expansion11ShadowKey;
  expectedMin: number;
  expectedMax: number;
  /** When true, null is a pass (distinction / silence cases). */
  allowNull?: boolean;
}

interface Expansion11Fixture {
  id: string;
  aboutMe: string;
  signal?: Expansion11ShadowKey;
  expectedMin?: number;
  expectedMax?: number;
  expectations?: Expansion11Expectation[];
}

function flattenExpectations(
  fixture: Expansion11Fixture,
): Expansion11Expectation[] {
  if (fixture.expectations && fixture.expectations.length > 0) {
    return fixture.expectations;
  }
  if (
    fixture.signal != null &&
    fixture.expectedMin != null &&
    fixture.expectedMax != null
  ) {
    return [
      {
        signal: fixture.signal,
        expectedMin: fixture.expectedMin,
        expectedMax: fixture.expectedMax,
      },
    ];
  }
  throw new Error(
    `Fixture ${fixture.id} must have either signal+expectedMin/Max or expectations[]`,
  );
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log('SKIP: no OPENAI_API_KEY');
    process.exit(0);
  }

  const raw = await readFile(FIXTURES_PATH, 'utf8');
  const fixtures = JSON.parse(raw) as Expansion11Fixture[];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const extraction = app.get(ExtractionService);

  let passes = 0;
  let scored = 0;

  for (const fixture of fixtures) {
    const expectations = flattenExpectations(fixture);
    const extracted = await extraction.extract(
      'self',
      fixture.aboutMe,
      fixture.id,
    );

    for (const exp of expectations) {
      scored += 1;
      const score = extracted.signals[exp.signal] ?? null;
      if (score == null) {
        if (exp.allowNull) {
          passes += 1;
          console.log(`PASS ${fixture.id}: ${exp.signal}=null (allowNull)`);
        } else {
          console.log(
            `FAIL ${fixture.id}: ${exp.signal}=null (expected ${exp.expectedMin}-${exp.expectedMax})`,
          );
        }
        continue;
      }
      const ok = score >= exp.expectedMin && score <= exp.expectedMax;
      if (ok) {
        passes += 1;
        console.log(`PASS ${fixture.id}: ${exp.signal}=${score}`);
      } else {
        console.log(
          `FAIL ${fixture.id}: ${exp.signal}=${score} (expected ${exp.expectedMin}-${exp.expectedMax})`,
        );
      }
    }
  }

  await app.close();

  const agreement = scored === 0 ? 0 : passes / scored;
  console.log(
    `\nExpansion-11 extraction agreement: ${(agreement * 100).toFixed(1)}% (${passes}/${scored} scored expectations)`,
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
