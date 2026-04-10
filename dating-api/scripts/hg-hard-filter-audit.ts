/**
 * Read-only audit: pair-level HG hard-filter FAIL events for the same pool as hg-validation-report.ts.
 * Does not change matching behavior or data.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { HOLY_GRAIL_DIMENSION_KEYS, type HolyGrailDimensionKey } from '../src/holy-grail-matching/holy-grail-dimensions';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import { evaluateHolyGrailDirectional } from '../src/holy-grail-matching/eligibility.evaluator';
import { buildHolyGrailProfileMappingInputFromDbRow } from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';

const SYNTHETIC_ID_PREFIX_ALLOWLIST = ['synthetic-he-', 'synthetic-en-', 'synthetic-hg-gap-'] as const;
const VALIDATION_CANDIDATE_PREFIXES = SYNTHETIC_ID_PREFIX_ALLOWLIST;

interface FailEvent {
  readonly dimension: HolyGrailDimensionKey;
  readonly reasonCode: string;
  readonly preferenceHolderId: string;
  readonly counterpartyId: string;
  readonly reportSearcherId: string;
  readonly directionLabel: 'report_searcher_to_candidate' | 'candidate_to_report_searcher';
}

function initDimCounts(): Record<HolyGrailDimensionKey, { pass: number; fail: number; skip: number }> {
  return HOLY_GRAIL_DIMENSION_KEYS.reduce(
    (acc, k) => {
      acc[k] = { pass: 0, fail: 0, skip: 0 };
      return acc;
    },
    {} as Record<HolyGrailDimensionKey, { pass: number; fail: number; skip: number }>,
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const fails: FailEvent[] = [];
  const dimCounts = initDimCounts();
  const reasonCounts = new Map<string, number>();

  try {
    const searchers = await prisma.userProfile.findMany({
      where: {
        OR: SYNTHETIC_ID_PREFIX_ALLOWLIST.map((prefix) => ({ id: { startsWith: prefix } })),
      },
      orderBy: [{ id: 'asc' }],
      take: 5,
      select: { id: true },
    });

    for (const { id: reportSearcherId } of searchers) {
      const sRow = await prisma.userProfile.findUnique({
        where: { id: reportSearcherId },
        include: { extractionV2: { select: { interests_self: true, interests: true, lifestyleTraits: true } } },
      });
      if (!sRow) continue;
      const sInput = buildHolyGrailProfileMappingInputFromDbRow({
        profileId: sRow.id,
        extractionV2: sRow.extractionV2,
        holyGrailStructuredFacts: sRow.holyGrailStructuredFacts,
        holyGrailStructuredPreferences: sRow.holyGrailStructuredPreferences,
      });
      let sCanon;
      try {
        sCanon = mapProfileSourceToMatchingCanonical(sInput);
      } catch {
        continue;
      }

      const candidateRows = await prisma.userProfile.findMany({
        where: {
          id: { not: reportSearcherId },
          OR: VALIDATION_CANDIDATE_PREFIXES.map((prefix) => ({ id: { startsWith: prefix } })),
        },
        orderBy: [{ id: 'asc' }],
        include: { extractionV2: { select: { interests_self: true, interests: true, lifestyleTraits: true } } },
      });

      for (const cRow of candidateRows) {
        const cInput = buildHolyGrailProfileMappingInputFromDbRow({
          profileId: cRow.id,
          extractionV2: cRow.extractionV2,
          holyGrailStructuredFacts: cRow.holyGrailStructuredFacts,
          holyGrailStructuredPreferences: cRow.holyGrailStructuredPreferences,
        });
        let cCanon;
        try {
          cCanon = mapProfileSourceToMatchingCanonical(cInput);
        } catch {
          continue;
        }

        const stc = evaluateHolyGrailDirectional({ searcher: sCanon, counterparty: cCanon });
        const cts = evaluateHolyGrailDirectional({ searcher: cCanon, counterparty: sCanon });

        const recordDir = (
          dir: typeof stc,
          directionLabel: FailEvent['directionLabel'],
          prefHolderId: string,
          counterpartyId: string,
        ) => {
          for (const dim of HOLY_GRAIL_DIMENSION_KEYS) {
            const d = dir.dimensions[dim];
            if (d.status === 'PASS') dimCounts[dim].pass += 1;
            else if (d.status === 'FAIL') {
              dimCounts[dim].fail += 1;
              const rk = `${dim}:${d.reasonCode}`;
              reasonCounts.set(rk, (reasonCounts.get(rk) ?? 0) + 1);
              fails.push({
                dimension: dim,
                reasonCode: d.reasonCode,
                preferenceHolderId: prefHolderId,
                counterpartyId,
                reportSearcherId,
                directionLabel,
              });
            } else dimCounts[dim].skip += 1;
          }
        };

        recordDir(stc, 'report_searcher_to_candidate', reportSearcherId, cRow.id);
        recordDir(cts, 'candidate_to_report_searcher', cRow.id, reportSearcherId);
      }
    }

    const outPath = resolve(process.cwd(), 'scripts', '.hg-hard-filter-audit-output.json');
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          reportSearchers: searchers.map((s) => s.id),
          dimCounts,
          reasonCounts: Object.fromEntries([...reasonCounts.entries()].sort((a, b) => b[1] - a[1])),
          failEvents: fails,
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log(`wrote ${fails.length} fail events to ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('hg-hard-filter-audit failed:', err);
  process.exit(1);
});
