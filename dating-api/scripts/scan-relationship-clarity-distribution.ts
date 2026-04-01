import { PrismaClient } from '@prisma/client';

type ClassKey = 'NON_NULL_ALL' | 'PARTIAL' | 'NULL_ALL';

interface DistributionBucket {
  count: number;
  percent: number;
}

interface DistributionReport {
  total: number;
  NON_NULL_ALL: DistributionBucket;
  PARTIAL: DistributionBucket;
  NULL_ALL: DistributionBucket;
}

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const LIMIT = 500;

function classifyScalars(
  selfVal: number | null,
  partnerVal: number | null,
  relationshipVal: number | null,
): ClassKey {
  const nonNullCount = [selfVal, partnerVal, relationshipVal].filter(
    (v) => typeof v === 'number',
  ).length;
  if (nonNullCount === 3) return 'NON_NULL_ALL';
  if (nonNullCount === 0) return 'NULL_ALL';
  return 'PARTIAL';
}

function toPercent(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

async function runAnalyzeV2(profileId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/profiles/${encodeURIComponent(
    profileId,
  )}/analyze-v2?force=1`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`analyze-v2 failed for ${profileId}: ${response.status} ${text}`);
  }
}

async function main(): Promise<void> {
  const profiles = await prisma.userProfile.findMany({
    select: { id: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: LIMIT,
  });

  const counts: Record<ClassKey, number> = {
    NON_NULL_ALL: 0,
    PARTIAL: 0,
    NULL_ALL: 0,
  };
  const nonNullAllIds: string[] = [];
  let processed = 0;

  for (const [index, profile] of profiles.entries()) {
    const profileId = profile.id;
    try {
      await runAnalyzeV2(profileId);
    } catch (err) {
      // Keep scan deterministic: treat API failures as NULL_ALL bucket.
      counts.NULL_ALL++;
      processed++;
      if ((index + 1) % 10 === 0) {
        console.log(
          `[${index + 1}/${profiles.length}] processed=${processed} NON_NULL_ALL=${counts.NON_NULL_ALL} PARTIAL=${counts.PARTIAL} NULL_ALL=${counts.NULL_ALL}`,
        );
      }
      continue;
    }

    const row = await prisma.profileExtractionV2.findUnique({
      where: { profileId },
      select: {
        relationship_clarity_self: true,
        relationship_clarity_partner: true,
        relationship_clarity_relationship: true,
      },
    });

    const cls = classifyScalars(
      row?.relationship_clarity_self ?? null,
      row?.relationship_clarity_partner ?? null,
      row?.relationship_clarity_relationship ?? null,
    );
    counts[cls]++;
    if (cls === 'NON_NULL_ALL') {
      nonNullAllIds.push(profileId);
    }
    processed++;

    if ((index + 1) % 10 === 0) {
      console.log(
        `[${index + 1}/${profiles.length}] processed=${processed} NON_NULL_ALL=${counts.NON_NULL_ALL} PARTIAL=${counts.PARTIAL} NULL_ALL=${counts.NULL_ALL}`,
      );
    }

    // Optional optimization: stop if NON_NULL_ALL reaches >= 20%.
    if (processed > 0 && counts.NON_NULL_ALL / processed >= 0.2) {
      console.log(
        `Early stop at ${processed} profiles (NON_NULL_ALL ${(counts.NON_NULL_ALL / processed * 100).toFixed(2)}%)`,
      );
      break;
    }
  }

  const total = processed;
  const report: DistributionReport = {
    total,
    NON_NULL_ALL: {
      count: counts.NON_NULL_ALL,
      percent: toPercent(counts.NON_NULL_ALL, total),
    },
    PARTIAL: {
      count: counts.PARTIAL,
      percent: toPercent(counts.PARTIAL, total),
    },
    NULL_ALL: {
      count: counts.NULL_ALL,
      percent: toPercent(counts.NULL_ALL, total),
    },
  };

  console.log(JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        top10_NON_NULL_ALL_profileIds: nonNullAllIds.slice(0, 10),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
