import { PrismaClient } from '@prisma/client';

type ClassKey = 'NON_NULL_ALL' | 'PARTIAL' | 'NULL_ALL';

interface SummaryBucket {
  count: number;
  percent: number;
}

interface SummaryReport {
  total: number;
  NON_NULL_ALL: SummaryBucket;
  PARTIAL: SummaryBucket;
  NULL_ALL: SummaryBucket;
  top20_NON_NULL_ALL_profileIds: string[];
  top20_PARTIAL_profileIds: string[];
  sample10_NULL_ALL_profileIds: string[];
}

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const LIMIT = 500;

function toPercent(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

function classify(
  selfVal: number | null,
  partnerVal: number | null,
  relationshipVal: number | null,
): ClassKey {
  const nonNullCount = [selfVal, partnerVal, relationshipVal].filter(
    (v) => typeof v === 'number',
  ).length;
  if (nonNullCount === 3) return 'NON_NULL_ALL';
  if (nonNullCount >= 1) return 'PARTIAL';
  return 'NULL_ALL';
}

async function analyzeViaApi(profileId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/profiles/${encodeURIComponent(
    profileId,
  )}/analyze-v2?force=1`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `analyze-v2 failed profileId=${profileId} status=${response.status} body=${body}`,
    );
  }
}

async function main(): Promise<void> {
  const profiles = await prisma.userProfile.findMany({
    select: { id: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: LIMIT,
  });

  const idsByClass: Record<ClassKey, string[]> = {
    NON_NULL_ALL: [],
    PARTIAL: [],
    NULL_ALL: [],
  };
  let processed = 0;

  for (const [idx, profile] of profiles.entries()) {
    const profileId = profile.id;
    try {
      await analyzeViaApi(profileId);
    } catch {
      // Scan must continue on failures; classify as NULL_ALL (no usable scalar output).
      idsByClass.NULL_ALL.push(profileId);
      processed++;
      if ((idx + 1) % 10 === 0) {
        console.log(
          `[${idx + 1}/${profiles.length}] processed=${processed} NON_NULL_ALL=${idsByClass.NON_NULL_ALL.length} PARTIAL=${idsByClass.PARTIAL.length} NULL_ALL=${idsByClass.NULL_ALL.length}`,
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

    const cls = classify(
      row?.relationship_clarity_self ?? null,
      row?.relationship_clarity_partner ?? null,
      row?.relationship_clarity_relationship ?? null,
    );
    idsByClass[cls].push(profileId);
    processed++;

    if ((idx + 1) % 10 === 0) {
      console.log(
        `[${idx + 1}/${profiles.length}] processed=${processed} NON_NULL_ALL=${idsByClass.NON_NULL_ALL.length} PARTIAL=${idsByClass.PARTIAL.length} NULL_ALL=${idsByClass.NULL_ALL.length}`,
      );
    }
  }

  const total = processed;
  const report: SummaryReport = {
    total,
    NON_NULL_ALL: {
      count: idsByClass.NON_NULL_ALL.length,
      percent: toPercent(idsByClass.NON_NULL_ALL.length, total),
    },
    PARTIAL: {
      count: idsByClass.PARTIAL.length,
      percent: toPercent(idsByClass.PARTIAL.length, total),
    },
    NULL_ALL: {
      count: idsByClass.NULL_ALL.length,
      percent: toPercent(idsByClass.NULL_ALL.length, total),
    },
    top20_NON_NULL_ALL_profileIds: idsByClass.NON_NULL_ALL.slice(0, 20),
    top20_PARTIAL_profileIds: idsByClass.PARTIAL.slice(0, 20),
    sample10_NULL_ALL_profileIds: idsByClass.NULL_ALL.slice(0, 10),
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
