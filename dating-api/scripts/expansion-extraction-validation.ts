/**
 * Shared live LLM fixture validation for expansion shadow signals.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExtractionService } from '../src/extraction/extraction.service';

export const AGREEMENT_THRESHOLD = 0.85;

export interface ExpansionFixture {
  id: string;
  aboutMe: string;
  signal: string;
  expectedMin: number;
  expectedMax: number;
}

export interface SignalValidationResult {
  signal: string;
  sprint: string;
  passes: number;
  scored: number;
  agreement: number;
  pass: boolean;
}

export async function loadFixtures(relativePath: string): Promise<ExpansionFixture[]> {
  const raw = await readFile(join(process.cwd(), 'data', relativePath), 'utf8');
  return JSON.parse(raw) as ExpansionFixture[];
}

export async function validateFixtureFile(
  extraction: ExtractionService,
  fixtures: ExpansionFixture[],
  sprint: string,
  logDetails = true,
): Promise<SignalValidationResult[]> {
  const bySignal = new Map<string, { passes: number; scored: number }>();

  for (const fixture of fixtures) {
    const extracted = await extraction.extract('self', fixture.aboutMe, fixture.id);
    const score = extracted.signals[fixture.signal] ?? null;
    const bucket = bySignal.get(fixture.signal) ?? { passes: 0, scored: 0 };
    if (score == null) {
      if (logDetails) {
        console.log(
          `FAIL ${fixture.id}: null (expected ${fixture.expectedMin}-${fixture.expectedMax})`,
        );
      }
    } else {
      bucket.scored += 1;
      const ok = score >= fixture.expectedMin && score <= fixture.expectedMax;
      if (ok) {
        bucket.passes += 1;
        if (logDetails) {
          console.log(`PASS ${fixture.id}: ${fixture.signal}=${score}`);
        }
      } else if (logDetails) {
        console.log(
          `FAIL ${fixture.id}: ${fixture.signal}=${score} (expected ${fixture.expectedMin}-${fixture.expectedMax})`,
        );
      }
    }
    bySignal.set(fixture.signal, bucket);
  }

  const results: SignalValidationResult[] = [];
  for (const [signal, bucket] of bySignal.entries()) {
    const agreement = bucket.scored === 0 ? 0 : bucket.passes / bucket.scored;
    results.push({
      signal,
      sprint,
      passes: bucket.passes,
      scored: bucket.scored,
      agreement,
      pass: agreement >= AGREEMENT_THRESHOLD,
    });
  }
  return results.sort((a, b) => a.signal.localeCompare(b.signal));
}
