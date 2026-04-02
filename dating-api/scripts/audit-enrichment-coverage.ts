/**
 * Enrichment coverage audit: non-null % per field over all profiles with v1 enrichment.
 *
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/audit-enrichment-coverage.ts
 */

import { PrismaClient } from '@prisma/client';

const SCALAR_FIELDS = [
  'dailyRhythm',
  'autonomyTogethernessDepth',
  'kidsTimeline',
  'conflictStyleDetail',
] as const;

type ScalarField = (typeof SCALAR_FIELDS)[number];

function isPlainEvaluationJson(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function parseEnrichment(
  evaluation: unknown,
): { scalars: Record<ScalarField, string | null>; interestsLen: number } | null {
  if (!isPlainEvaluationJson(evaluation)) return null;
  const en = evaluation.enrichment;
  if (!en || typeof en !== 'object' || Array.isArray(en)) return null;
  if ((en as Record<string, unknown>).version !== 'v1') return null;
  const sig = (en as Record<string, unknown>).signals;
  if (!sig || typeof sig !== 'object' || Array.isArray(sig)) return null;
  const s = sig as Record<string, unknown>;
  const str = (k: ScalarField): string | null =>
    typeof s[k] === 'string' && s[k]!.trim() ? (s[k] as string) : null;
  const interests = Array.isArray(s.interestsTop3)
    ? s.interestsTop3.filter((x): x is string => typeof x === 'string' && x.trim())
    : [];
  return {
    scalars: {
      dailyRhythm: str('dailyRhythm'),
      autonomyTogethernessDepth: str('autonomyTogethernessDepth'),
      kidsTimeline: str('kidsTimeline'),
      conflictStyleDetail: str('conflictStyleDetail'),
    },
    interestsLen: interests.length,
  };
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.userProfile.findMany({
      where: { evaluationRaw: { isNot: null } },
      select: {
        id: true,
        name: true,
        aboutMe: true,
        aboutPartner: true,
        aboutRelationship: true,
        evaluationRaw: { select: { evaluation: true } },
      },
      orderBy: { id: 'asc' },
    });

    let withEnrichment = 0;
    const nonNullCount: Record<ScalarField, number> = {
      dailyRhythm: 0,
      autonomyTogethernessDepth: 0,
      kidsTimeline: 0,
      conflictStyleDetail: 0,
    };
    let interestsAny = 0;

    const samplesNull: Record<ScalarField, Array<{ id: string; name: string; aboutMeClip: string }>> = {
      dailyRhythm: [],
      autonomyTogethernessDepth: [],
      kidsTimeline: [],
      conflictStyleDetail: [],
    };

    for (const row of rows) {
      const ev = row.evaluationRaw?.evaluation;
      const parsed = parseEnrichment(ev);
      if (!parsed) continue;
      withEnrichment += 1;
      if (parsed.interestsLen > 0) interestsAny += 1;
      for (const f of SCALAR_FIELDS) {
        if (parsed.scalars[f] != null) {
          nonNullCount[f] += 1;
        } else if (samplesNull[f].length < 10) {
          samplesNull[f].push({
            id: row.id,
            name: row.name,
            aboutMeClip: clip(row.aboutMe ?? '', 140),
          });
        }
      }
    }

    const pct = (c: number) =>
      withEnrichment === 0 ? 0 : Math.round((10_000 * c) / withEnrichment) / 100;

    const coverageRows = [
      ...SCALAR_FIELDS.map((f) => ({
        field: f,
        nonNull: nonNullCount[f],
        pct: pct(nonNullCount[f]),
      })),
      { field: 'interestsTop3 (any)', nonNull: interestsAny, pct: pct(interestsAny) },
    ].sort((a, b) => a.pct - b.pct);

    console.log(JSON.stringify({ baseProfilesWithV1Enrichment: withEnrichment, coverage: coverageRows }, null, 2));
    console.log('\n--- 10 samples per scalar field (field null; first 10 in id order) ---\n');
    for (const f of SCALAR_FIELDS) {
      console.log(`## ${f} null samples`);
      console.log(JSON.stringify(samplesNull[f], null, 2));
      console.log('');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
