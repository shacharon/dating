/**
 * Optional live LLM validation for Expansion-09 interest tags.
 * Compares self-domain extraction rawInterests against curated fixtures.
 *
 * Run: npm run validate:expansion-09-extraction
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
const FIXTURES_PATH = join(ROOT, 'data', 'expansion-09-interest-fixtures.json');
const AGREEMENT_THRESHOLD = 0.85;

interface Expansion09Fixture {
  id: string;
  aboutMe: string;
  expectedTags?: string[];
  expectedTagsAnyOf?: string[][];
}

function tagsPass(
  rawInterests: readonly string[] | undefined,
  fixture: Expansion09Fixture,
): boolean {
  const got = new Set((rawInterests ?? []).map((t) => t.toLowerCase()));
  if (fixture.expectedTags && fixture.expectedTags.length > 0) {
    return fixture.expectedTags.every((t) => got.has(t.toLowerCase()));
  }
  if (fixture.expectedTagsAnyOf && fixture.expectedTagsAnyOf.length > 0) {
    return fixture.expectedTagsAnyOf.some((combo) =>
      combo.every((t) => got.has(t.toLowerCase())),
    );
  }
  throw new Error(
    `Fixture ${fixture.id} must have expectedTags or expectedTagsAnyOf`,
  );
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log('SKIP: no OPENAI_API_KEY');
    process.exit(0);
  }

  const raw = await readFile(FIXTURES_PATH, 'utf8');
  const fixtures = JSON.parse(raw) as Expansion09Fixture[];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const extraction = app.get(ExtractionService);

  let passes = 0;
  let scored = 0;

  for (const fixture of fixtures) {
    scored += 1;
    const extracted = await extraction.extract(
      'self',
      fixture.aboutMe,
      fixture.id,
    );
    const ok = tagsPass(extracted.rawInterests, fixture);
    if (ok) {
      passes += 1;
      console.log(
        `PASS ${fixture.id}: rawInterests=${JSON.stringify(extracted.rawInterests ?? [])}`,
      );
    } else {
      console.log(
        `FAIL ${fixture.id}: rawInterests=${JSON.stringify(extracted.rawInterests ?? [])}`,
      );
    }
  }

  await app.close();

  const agreement = scored === 0 ? 0 : passes / scored;
  console.log(
    `\nExpansion-09 interest agreement: ${(agreement * 100).toFixed(1)}% (${passes}/${scored} fixtures)`,
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
