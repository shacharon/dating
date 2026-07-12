/**
 * Operator CLI: compare match-quality feedback KPIs across two disjoint windows.
 *
 * Run (from dating-api):
 *   npm run match-quality:compare -- --before-days 7 --after-days 7
 *   npm run match-quality:compare -- --before-start 2026-05-20T00:00:00.000Z --before-end 2026-05-27T00:00:00.000Z --after-start 2026-05-27T00:00:00.000Z --after-end 2026-06-03T00:00:00.000Z
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdminMatchQualityService } from '../src/admin/admin-match-quality/admin-match-quality.service';
import type { MatchQualityCompareQueryDto } from '../src/admin/admin-match-quality/dto/match-quality-compare-query.dto';
import { resolveCompareWindows } from '../src/admin/admin-match-quality/match-quality-window';

function parseArgs(argv: string[]): MatchQualityCompareQueryDto {
  const query: MatchQualityCompareQueryDto = {};

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--before-days' && argv[i + 1]) {
      query.beforeDays = Number(argv[++i]);
    } else if (a === '--after-days' && argv[i + 1]) {
      query.afterDays = Number(argv[++i]);
    } else if (a === '--before-start' && argv[i + 1]) {
      query.beforeStart = argv[++i];
    } else if (a === '--before-end' && argv[i + 1]) {
      query.beforeEnd = argv[++i];
    } else if (a === '--after-start' && argv[i + 1]) {
      query.afterStart = argv[++i];
    } else if (a === '--after-end' && argv[i + 1]) {
      query.afterEnd = argv[++i];
    }
  }

  return query;
}

async function main() {
  const query = parseArgs(process.argv);
  const windows = resolveCompareWindows(query);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  try {
    const matchQuality = app.get(AdminMatchQualityService);
    const result = await matchQuality.compareMatchQuality('cli', windows);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('FATAL:', e?.response?.error ?? e?.message ?? e);
  process.exit(1);
});
