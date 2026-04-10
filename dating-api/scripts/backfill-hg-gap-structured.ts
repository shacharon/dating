/**
 * Persists Holy Grail structured JSON for `synthetic-hg-gap-*` profiles using the same
 * merge + validation rules as `HolyGrailStructuredWriteService`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from '../src/holy-grail-matching/holy-grail-structured-write.merge';
import { deriveHgGapStructuredLayers } from './derive-hg-gap-structured';

interface SeedRow {
  id: string;
  aboutMe: string;
  aboutPartner?: string;
}

async function main(): Promise<void> {
  const filePath = resolve(process.cwd(), 'data/profiles-hg-gap-combined.json');
  const rows = JSON.parse(readFileSync(filePath, 'utf8')) as SeedRow[];
  const prisma = new PrismaClient();
  let ok = 0;
  try {
    for (const row of rows) {
      if (!row.id.startsWith('synthetic-hg-gap-')) continue;
      const { structuredFactsPatch, structuredPreferencesPatch } = deriveHgGapStructuredLayers({
        id: row.id,
        aboutMe: row.aboutMe ?? '',
        aboutPartner: row.aboutPartner ?? '',
      });
      const existing = await prisma.userProfile.findUnique({
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
      await prisma.userProfile.update({
        where: { id: row.id },
        data: { holyGrailStructuredFacts, holyGrailStructuredPreferences },
      });
      ok += 1;
      console.log(`backfilled_structured=${row.id}`);
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`backfill_hg_gap_structured_ok=${ok}`);
}

main().catch((err) => {
  console.error('backfill-hg-gap-structured failed:', err);
  process.exit(1);
});
