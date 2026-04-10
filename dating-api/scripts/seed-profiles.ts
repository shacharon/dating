import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface SeedProfileRow {
  id: string;
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
}

function getArg(name: string): string | undefined {
  const key = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(key));
  return hit ? hit.slice(key.length) : undefined;
}

async function main(): Promise<void> {
  const fileArg = getArg('file');
  if (!fileArg) {
    throw new Error('Missing required --file=... argument');
  }

  let filePath = resolve(process.cwd(), fileArg);
  if (!existsSync(filePath) && fileArg === 'combined.json') {
    filePath = resolve(process.cwd(), 'data', 'profiles-combined.json');
  }
  const raw = readFileSync(filePath, 'utf8');
  const rows = JSON.parse(raw) as SeedProfileRow[];
  if (!Array.isArray(rows)) {
    throw new Error('Input file must contain a JSON array');
  }

  const prisma = new PrismaClient();
  let upserted = 0;
  try {
    for (const row of rows) {
      if (!row?.id || !row.aboutMe) continue;
      await prisma.userProfile.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          name: `Synthetic ${row.id}`,
          aboutMe: row.aboutMe,
          aboutPartner: row.aboutPartner ?? '',
          aboutRelationship: row.aboutRelationship ?? '',
        },
        update: {
          name: `Synthetic ${row.id}`,
          aboutMe: row.aboutMe,
          aboutPartner: row.aboutPartner ?? '',
          aboutRelationship: row.aboutRelationship ?? '',
        },
      });
      upserted += 1;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`seeded_profiles=${upserted}`);
  console.log(`source_file=${fileArg}`);
}

main().catch((err) => {
  console.error('seed-profiles failed:', err);
  process.exit(1);
});
