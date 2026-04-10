import { PrismaClient } from '@prisma/client';
import { HOLY_GRAIL_DIMENSION_KEYS, type HolyGrailDimensionKey } from '../src/holy-grail-matching/holy-grail-dimensions';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import { evaluateHolyGrailDirectional } from '../src/holy-grail-matching/eligibility.evaluator';
import { buildHolyGrailProfileMappingInputFromDbRow } from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';

type DimCounts = Record<HolyGrailDimensionKey, number>;
const SYNTHETIC_ID_PREFIX_ALLOWLIST = ['synthetic-he-', 'synthetic-en-', 'synthetic-hg-gap-'] as const;
/** Validation candidate pool: all synthetic profiles (not an arbitrary global oldest-N slice). */
const VALIDATION_CANDIDATE_PREFIXES = SYNTHETIC_ID_PREFIX_ALLOWLIST;

function initCounts(): DimCounts {
  return HOLY_GRAIL_DIMENSION_KEYS.reduce(
    (acc, k) => {
      acc[k] = 0;
      return acc;
    },
    {} as DimCounts,
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  const searchers = await prisma.userProfile.findMany({
    where: {
      OR: SYNTHETIC_ID_PREFIX_ALLOWLIST.map((prefix) => ({ id: { startsWith: prefix } })),
    },
    orderBy: [{ id: 'asc' }],
    take: 5,
    select: { id: true },
  });
  const searcherIds = searchers.map((x) => x.id);

  const skipped = initCounts();
  const passed = initCounts();
  const failed = initCounts();
  const totals = initCounts();
  const failReasons: Record<string, number> = {};

  try {
    console.log('=== HG VALIDATION REPORT ===');
    for (const searcherId of searcherIds) {
      const sRow = await prisma.userProfile.findUnique({
        where: { id: searcherId },
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
          id: { not: searcherId },
          OR: VALIDATION_CANDIDATE_PREFIXES.map((prefix) => ({ id: { startsWith: prefix } })),
        },
        orderBy: [{ id: 'asc' }],
        include: { extractionV2: { select: { interests_self: true, interests: true, lifestyleTraits: true } } },
      });

      let passedHardFilter = 0;
      let canonicalMapFailed = 0;
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
          canonicalMapFailed += 1;
          continue;
        }
        const stc = evaluateHolyGrailDirectional({ searcher: sCanon, counterparty: cCanon });
        const cts = evaluateHolyGrailDirectional({ searcher: cCanon, counterparty: sCanon });
        if (stc.overallHardEligibility === 'PASS' && cts.overallHardEligibility === 'PASS') {
          passedHardFilter += 1;
        }
        const dirs = [stc, cts];
        for (const dir of dirs) {
          for (const dim of HOLY_GRAIL_DIMENSION_KEYS) {
            totals[dim] += 1;
            const d = dir.dimensions[dim];
            if (d.status === 'SKIPPED') skipped[dim] += 1;
            if (d.status === 'PASS') passed[dim] += 1;
            if (d.status === 'FAIL') {
              failed[dim] += 1;
              const key = `${dim}:${d.reasonCode}`;
              failReasons[key] = (failReasons[key] ?? 0) + 1;
            }
          }
        }
      }
      console.log(
        `searcher=${searcherId} retrieved=${candidateRows.length} passedHardFilter=${passedHardFilter} canonicalMapFailed=${canonicalMapFailed}`,
      );
    }

    console.log('\ncoverage_per_dimension:');
    for (const dim of HOLY_GRAIL_DIMENSION_KEYS) {
      const total = totals[dim];
      const active = total - skipped[dim];
      const coverage = total > 0 ? ((100 * active) / total).toFixed(1) : '0.0';
      const skippedPct = total > 0 ? ((100 * skipped[dim]) / total).toFixed(1) : '0.0';
      console.log(
        `${dim} coverage=${coverage}% skippedPct=${skippedPct}% pass=${passed[dim]} fail=${failed[dim]} skipped=${skipped[dim]} total=${total}`,
      );
    }

    console.log('\ntop_fail_reasons:');
    for (const [key, count] of Object.entries(failReasons)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 20)) {
      console.log(`${key}=${count}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('hg-validation-report failed:', err);
  process.exit(1);
});
