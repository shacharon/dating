/**
 * Phase F: one MeMatchesService.list() per distinct user with an ANALYZED profile (real DB).
 * Run: npx ts-node --project tsconfig.json scripts/phase-f-fallback-validation.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MeMatchesService } from '../src/me-profile/me-matches.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const matches = app.get(MeMatchesService);

  const rows = await prisma.userProfile.findMany({
    where: { status: 'ANALYZED' },
    select: { userId: true },
  });
  const userIds = [...new Set(rows.map((r) => r.userId))];

  for (const userId of userIds) {
    await matches.list(userId);
  }

  console.log(
    JSON.stringify({
      event: 'phase_f_fallback_validation',
      matchListCalls: userIds.length,
      analyzedProfileRows: rows.length,
    }),
  );

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
