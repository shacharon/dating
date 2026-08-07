/**
 * Phase 1 EQ correlation report — Pearson r matrix for 5 shadow EQ signals.
 *
 * Run: npm run report:phase1-eq-correlation
 * Report-only: exit 0 even when |r|>0.85 pairs are flagged (warnings only).
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExtractionService } from '../src/extraction/extraction.service';

dotenv.config();

const ROOT = process.cwd();
const FIXTURES_PATH = join(ROOT, 'data', 'phase1-eq-correlation-fixtures.json');
const CORRELATION_FLAG_THRESHOLD = 0.85;

const EQ_SHADOW_KEYS = [
  'empathyCompassion',
  'vulnerabilityOpenness',
  'emotionalRegulation',
  'physicalAffectionStyle',
  'humorPlayfulness',
] as const;

const WATCH_KEYS = ['noveltyVsRoutine', 'socialBattery'] as const;

type EqKey = (typeof EQ_SHADOW_KEYS)[number];
type WatchKey = (typeof WATCH_KEYS)[number];
type MatrixKey = EqKey | WatchKey;

interface CorrelationFixture {
  id: string;
  aboutMe: string;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return Number.NaN;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? Number.NaN : num / den;
}

function pairCorrelation(
  matrix: Record<MatrixKey, (number | null)[]>,
  a: MatrixKey,
  b: MatrixKey,
): { r: number; n: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  const len = matrix[a].length;
  for (let i = 0; i < len; i++) {
    const x = matrix[a][i];
    const y = matrix[b][i];
    if (x != null && y != null) {
      xs.push(x);
      ys.push(y);
    }
  }
  return { r: pearson(xs, ys), n: xs.length };
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log('SKIP: no OPENAI_API_KEY');
    process.exit(0);
  }

  const raw = await readFile(FIXTURES_PATH, 'utf8');
  const fixtures = JSON.parse(raw) as CorrelationFixture[];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const extraction = app.get(ExtractionService);

  const allKeys: MatrixKey[] = [...EQ_SHADOW_KEYS, ...WATCH_KEYS];
  const matrix = Object.fromEntries(
    allKeys.map((k) => [k, [] as (number | null)[]]),
  ) as Record<MatrixKey, (number | null)[]>;

  for (const fixture of fixtures) {
    const extracted = await extraction.extract('self', fixture.aboutMe, fixture.id);
    for (const key of allKeys) {
      const score = extracted.signals[key] ?? null;
      matrix[key].push(typeof score === 'number' ? score : null);
    }
    console.log(`Extracted ${fixture.id}`);
  }

  await app.close();

  console.log('\n=== Pearson r matrix (EQ shadow keys) ===');
  const header = ['', ...EQ_SHADOW_KEYS].join('\t');
  console.log(header);
  const flagged: string[] = [];

  for (const rowKey of EQ_SHADOW_KEYS) {
    const cells = EQ_SHADOW_KEYS.map((colKey) => {
      if (rowKey === colKey) return '1.000';
      const { r, n } = pairCorrelation(matrix, rowKey, colKey);
      if (!Number.isFinite(r)) return `n/a(n=${n})`;
      const label = r.toFixed(3);
      if (Math.abs(r) > CORRELATION_FLAG_THRESHOLD) {
        flagged.push(`${rowKey} vs ${colKey}: r=${label} (n=${n})`);
      }
      return label;
    });
    console.log([rowKey, ...cells].join('\t'));
  }

  console.log('\n=== Watch pairs (EQ vs official keys) ===');
  for (const eqKey of EQ_SHADOW_KEYS) {
    for (const watchKey of WATCH_KEYS) {
      const { r, n } = pairCorrelation(matrix, eqKey, watchKey);
      if (!Number.isFinite(r)) {
        console.log(`${eqKey} vs ${watchKey}: n/a (n=${n})`);
        continue;
      }
      const label = r.toFixed(3);
      console.log(`${eqKey} vs ${watchKey}: r=${label} (n=${n})`);
      if (Math.abs(r) > CORRELATION_FLAG_THRESHOLD) {
        flagged.push(`${eqKey} vs ${watchKey}: r=${label} (n=${n}) [watch]`);
      }
    }
  }

  if (flagged.length === 0) {
    console.log('\nNo pairs flagged above |r|>0.85');
  } else {
    console.warn('\nWARN: pairs with |r|>0.85 (review only — not a hard fail):');
    for (const line of flagged) {
      console.warn(`  - ${line}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
