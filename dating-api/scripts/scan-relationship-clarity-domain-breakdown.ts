import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const LIMIT = 500;

type DomainKey = 'self' | 'partner' | 'relationship';
type ComboKey =
  | 'only_self'
  | 'only_partner'
  | 'only_relationship'
  | 'self_partner'
  | 'self_relationship'
  | 'partner_relationship'
  | 'all_three'
  | 'all_null';

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 10000) / 100;
}

async function analyzeViaApi(profileId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/profiles/${encodeURIComponent(
    profileId,
  )}/analyze-v2?force=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `analyze-v2 failed profileId=${profileId} status=${response.status} body=${text}`,
    );
  }
}

function toCombo(
  selfVal: number | null,
  partnerVal: number | null,
  relationshipVal: number | null,
): ComboKey {
  const s = selfVal != null;
  const p = partnerVal != null;
  const r = relationshipVal != null;
  if (s && !p && !r) return 'only_self';
  if (!s && p && !r) return 'only_partner';
  if (!s && !p && r) return 'only_relationship';
  if (s && p && !r) return 'self_partner';
  if (s && !p && r) return 'self_relationship';
  if (!s && p && r) return 'partner_relationship';
  if (s && p && r) return 'all_three';
  return 'all_null';
}

async function main(): Promise<void> {
  const profiles = await prisma.userProfile.findMany({
    select: { id: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: LIMIT,
  });

  const nonNullByDomain: Record<DomainKey, number> = {
    self: 0,
    partner: 0,
    relationship: 0,
  };
  const nullByDomain: Record<DomainKey, number> = {
    self: 0,
    partner: 0,
    relationship: 0,
  };

  const combos: Record<ComboKey, number> = {
    only_self: 0,
    only_partner: 0,
    only_relationship: 0,
    self_partner: 0,
    self_relationship: 0,
    partner_relationship: 0,
    all_three: 0,
    all_null: 0,
  };

  let processed = 0;
  let apiFailures = 0;

  const CONCURRENCY = 10;
  for (let i = 0; i < profiles.length; i += CONCURRENCY) {
    const chunk = profiles.slice(i, i + CONCURRENCY);

    const analyzeResults = await Promise.allSettled(
      chunk.map((p) => analyzeViaApi(p.id)),
    );
    for (const r of analyzeResults) {
      if (r.status === 'rejected') apiFailures++;
    }

    const rows = await Promise.all(
      chunk.map((p) =>
        prisma.profileExtractionV2.findUnique({
          where: { profileId: p.id },
          select: {
            relationship_clarity_self: true,
            relationship_clarity_partner: true,
            relationship_clarity_relationship: true,
          },
        }),
      ),
    );

    for (const row of rows) {
      const selfVal = row?.relationship_clarity_self ?? null;
      const partnerVal = row?.relationship_clarity_partner ?? null;
      const relationshipVal = row?.relationship_clarity_relationship ?? null;

      if (selfVal != null) nonNullByDomain.self++;
      else nullByDomain.self++;
      if (partnerVal != null) nonNullByDomain.partner++;
      else nullByDomain.partner++;
      if (relationshipVal != null) nonNullByDomain.relationship++;
      else nullByDomain.relationship++;

      combos[toCombo(selfVal, partnerVal, relationshipVal)]++;
      processed++;
    }

    console.log(
      `[${Math.min(i + chunk.length, profiles.length)}/${profiles.length}] processed=${processed} failures=${apiFailures}`,
    );
  }

  const report = {
    total: processed,
    api_failures: apiFailures,
    fields: {
      relationship_clarity_self: {
        non_null_count: nonNullByDomain.self,
        null_count: nullByDomain.self,
        percent_non_null: pct(nonNullByDomain.self, processed),
        percent_null: pct(nullByDomain.self, processed),
      },
      relationship_clarity_partner: {
        non_null_count: nonNullByDomain.partner,
        null_count: nullByDomain.partner,
        percent_non_null: pct(nonNullByDomain.partner, processed),
        percent_null: pct(nullByDomain.partner, processed),
      },
      relationship_clarity_relationship: {
        non_null_count: nonNullByDomain.relationship,
        null_count: nullByDomain.relationship,
        percent_non_null: pct(nonNullByDomain.relationship, processed),
        percent_null: pct(nullByDomain.relationship, processed),
      },
    },
    combinations: combos,
    combinations_percent: Object.fromEntries(
      Object.entries(combos).map(([k, v]) => [k, pct(v, processed)]),
    ),
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

