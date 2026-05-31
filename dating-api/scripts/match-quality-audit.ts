/**
 * Operator CLI: V1 match quality audit (read-only). Same path as GET /api/v1/me/matches/:id.
 *
 * Run (from dating-api):
 *   npx ts-node --project tsconfig.json scripts/match-quality-audit.ts --viewer-user-id <USER_ID> --candidate-profile-id <PROFILE_ID>
 *
 * Options:
 *   --out <path>     Write JSON to file (default: stdout)
 *   --skip-list      Do not call list() (no rank / list counts)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { buildMatchQualityAuditJson } from '../src/me-profile/match-quality-audit';
import { MeMatchesService } from '../src/me-profile/me-matches.service';
import { PrismaService } from '../src/prisma/prisma.service';

function parseArgs(argv: string[]) {
  let viewerUserId: string | undefined;
  let candidateProfileId: string | undefined;
  let outPath: string | undefined;
  let skipList = false;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--viewer-user-id' && argv[i + 1]) {
      viewerUserId = argv[++i];
    } else if (a === '--candidate-profile-id' && argv[i + 1]) {
      candidateProfileId = argv[++i];
    } else if (a === '--out' && argv[i + 1]) {
      outPath = argv[++i];
    } else if (a === '--skip-list') {
      skipList = true;
    }
  }

  return { viewerUserId, candidateProfileId, outPath, skipList };
}

async function main() {
  const { viewerUserId, candidateProfileId, outPath, skipList } = parseArgs(
    process.argv,
  );

  if (!viewerUserId || !candidateProfileId) {
    console.error(
      'Usage: npx ts-node --project tsconfig.json scripts/match-quality-audit.ts --viewer-user-id <USER_ID> --candidate-profile-id <PROFILE_ID> [--out <file>] [--skip-list]',
    );
    process.exit(1);
  }

  const engineReadNormalized = process.env['ENGINE_READ_NORMALIZED'] === '1';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  try {
    const meMatches = app.get(MeMatchesService);
    const prisma = app.get(PrismaService);

    const report = await buildMatchQualityAuditJson({
      viewerUserId,
      candidateProfileId,
      meMatches,
      prisma,
      engineReadNormalized,
      includeListContext: !skipList,
    });

    const text = `${JSON.stringify(report, null, 2)}\n`;
    if (outPath) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, text, 'utf8');
      console.error(`Wrote ${outPath}`);
    } else {
      process.stdout.write(text);
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('FATAL:', e?.message ?? e);
  process.exit(1);
});
