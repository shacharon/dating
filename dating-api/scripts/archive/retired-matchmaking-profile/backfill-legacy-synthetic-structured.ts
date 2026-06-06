/**
 * Persists Holy Grail structured JSON for legacy `synthetic-he-*` / `synthetic-en-*` profiles
 * using the same merge path as `backfill-hg-gap-structured.ts` / `HolyGrailStructuredWriteService`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from '../../../src/holy-grail-matching/holy-grail-structured-write.merge';
import { deriveLegacySyntheticStructuredLayers } from './derive-legacy-synthetic-structured';

interface SeedRow {
  id: string;
  aboutMe: string;
  aboutPartner?: string;
}

async function main(): Promise<void> {
  const filePath = resolve(process.cwd(), 'data/profiles-combined.json');
  const rows = JSON.parse(readFileSync(filePath, 'utf8')) as SeedRow[];
  const prisma = new PrismaClient();
  let ok = 0;
  try {
    for (const row of rows) {
      if (!row.id.startsWith('synthetic-he-') && !row.id.startsWith('synthetic-en-')) continue;
      const { structuredFactsPatch, structuredPreferencesPatch } = deriveLegacySyntheticStructuredLayers({
        id: row.id,
        aboutMe: row.aboutMe ?? '',
        aboutPartner: row.aboutPartner ?? '',
      });
      const existing = await prisma.matchmakingProfile.findUnique({
        where: { id: row.id },
        select: { holyGrailStructuredFacts: true, holyGrailStructuredPreferences: true },
      });
      if (!existing) {
        console.error(`skip_missing_profile=${row.id}`);
        continue;
      }
      const holyGrailStructuredFacts = mergeHolyGrailStructuredFactsPatch(
        existing.holyGrailStructuredFacts,
        structuredFactsPatch,
      );
      const holyGrailStructuredPreferences = mergeHolyGrailStructuredPreferencesPatch(
        existing.holyGrailStructuredPreferences,
        structuredPreferencesPatch,
      );
      await prisma.matchmakingProfile.update({
        where: { id: row.id },
        data: { holyGrailStructuredFacts, holyGrailStructuredPreferences },
      });
      ok += 1;
      console.log(`backfilled_legacy_structured=${row.id}`);
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`backfill_legacy_synthetic_structured_ok=${ok}`);
}

main().catch((err) => {
  console.error('backfill-legacy-synthetic-structured failed:', err);
  process.exit(1);
});
