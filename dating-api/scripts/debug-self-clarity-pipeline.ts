import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const PROFILE_IDS = [
  'val-test-001',
  'val-test-003',
  'val-test-neg-001',
  'test-maya-001',
  'test-noa-003',
  'clarity-e2e-001',
];

function getProfileAboutMe(id: string): string {
  try {
    const path = join(process.cwd(), 'data', 'profiles', `${id}.json`);
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    const text = parsed?.texts?.aboutMe;
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

async function readState(profileId: string): Promise<{
  persistedSelfScalar: number | null;
  extractionSelfSignal: number | null;
}> {
  const row = await prisma.profileExtractionV2.findUnique({
    where: { profileId },
    select: {
      relationship_clarity_self: true,
      extractionJson: true,
    },
  });
  const extractionSelfSignal =
    (row?.extractionJson as any)?.base?.self?.signals?.relationshipClarity ?? null;
  return {
    persistedSelfScalar: row?.relationship_clarity_self ?? null,
    extractionSelfSignal:
      typeof extractionSelfSignal === 'number' ? extractionSelfSignal : null,
  };
}

async function analyze(profileId: string): Promise<{ status: number; body: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/profiles/${encodeURIComponent(profileId)}/analyze-v2?force=1`,
    { method: 'POST' },
  );
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function main(): Promise<void> {
  const results: Array<Record<string, unknown>> = [];

  for (const profileId of PROFILE_IDS) {
    const aboutMe = getProfileAboutMe(profileId);
    const before = await readState(profileId);
    const api = await analyze(profileId);
    const after = await readState(profileId);

    results.push({
      profileId,
      aboutMePreview: aboutMe.slice(0, 180),
      before,
      apiStatus: api.status,
      apiBodyPreview: api.body.slice(0, 200),
      after,
    });
  }

  console.log(JSON.stringify({ total: results.length, results }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

