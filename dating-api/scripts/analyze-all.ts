import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

const SYNTHETIC_ID_PREFIX_ALLOWLIST = ['synthetic-he-', 'synthetic-en-', 'synthetic-hg-gap-'] as const;

function getArg(name: string): string | undefined {
  const key = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(key));
  return hit ? hit.slice(key.length) : undefined;
}

function normalizeTags(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4 && x.length <= 24);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 40) break;
  }
  return out;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const prefixArg = getArg('prefix');
  const activePrefixes = prefixArg ? [prefixArg] : [...SYNTHETIC_ID_PREFIX_ALLOWLIST];

  const rows = await prisma.userProfile.findMany({
    where: {
      OR: activePrefixes.map((prefix) => ({ id: { startsWith: prefix } })),
    },
    orderBy: [{ id: 'asc' }],
    select: {
      id: true,
      aboutMe: true,
      aboutPartner: true,
      aboutRelationship: true,
    },
  });

  let ok = 0;
  let failed = 0;
  try {
    for (const row of rows) {
      try {
        const aboutMe = row.aboutMe ?? '';
        const aboutPartner = row.aboutPartner ?? '';
        const aboutRelationship = row.aboutRelationship ?? '';
        const textHash = createHash('sha256')
          .update(`${aboutMe}|${aboutPartner}|${aboutRelationship}`, 'utf8')
          .digest('hex')
          .slice(0, 16);
        const interests = normalizeTags(`${aboutMe} ${aboutPartner}`);

        await prisma.profileExtractionV2.upsert({
          where: { profileId: row.id },
          create: {
            profileId: row.id,
            promptVersion: 'synthetic_fast_v1',
            textHash,
            extractionJson: { synthetic: true, profileId: row.id } as any,
            selfSignals: {} as any,
            partnerSignals: {} as any,
            relationshipSignals: {} as any,
            coverageScore: 0,
            avgConfidence: 0,
            interests_self: interests.slice(0, 20),
            interests: interests,
            lifestyleTraits: normalizeTags(aboutMe).slice(0, 20),
          },
          update: {
            promptVersion: 'synthetic_fast_v1',
            textHash,
            extractionJson: { synthetic: true, profileId: row.id } as any,
            selfSignals: {} as any,
            partnerSignals: {} as any,
            relationshipSignals: {} as any,
            coverageScore: 0,
            avgConfidence: 0,
            interests_self: interests.slice(0, 20),
            interests: interests,
            lifestyleTraits: normalizeTags(aboutMe).slice(0, 20),
          },
        });

        ok += 1;
        console.log(`analyzed=${row.id}`);
      } catch (err) {
        failed += 1;
        console.log(`analyze_failed=${row.id} reason=${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`analyze_total=${rows.length}`);
  console.log(`analyze_ok=${ok}`);
  console.log(`analyze_failed=${failed}`);
  console.log(`analyze_prefixes=${activePrefixes.join(',')}`);
}

main().catch((err) => {
  console.error('analyze-all failed:', err);
  process.exit(1);
});
