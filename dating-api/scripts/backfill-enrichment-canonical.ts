/**
 * Backfill evaluation.enrichment.signals to canonical-only (sanitize only, no re-extraction).
 *
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/backfill-enrichment-canonical.ts
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/backfill-enrichment-canonical.ts --dry-run=true
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/backfill-enrichment-canonical.ts --limit=500 --concurrency=4
 */

import { Prisma, PrismaClient } from '@prisma/client';
import {
  sanitizeEnrichmentSignalsV1,
  wrapEnrichmentV1,
  type EnrichmentSignalsV1,
  type EnrichmentSignalsV1Input,
} from '../src/evaluate/enrichment-signals';

function parseArgs(): { dryRun: boolean; limit?: number; offset: number; concurrency: number } {
  const args = process.argv.slice(2);
  const byKey = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg || !arg.startsWith('--')) continue;
    const body = arg.slice(2);
    if (body.includes('=')) {
      const [k, ...rest] = body.split('=');
      byKey.set(k, rest.join('='));
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      byKey.set(body, next);
      i += 1;
    } else {
      byKey.set(body, 'true');
    }
  }
  const dryRun = (byKey.get('dry-run') || 'false').toLowerCase() === 'true';
  const limitRaw = byKey.get('limit');
  const limit =
    limitRaw && Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : undefined;
  const offset = Math.max(0, Number(byKey.get('offset') || '0') || 0);
  const concurrencyRaw = Number(byKey.get('concurrency') || '4');
  const concurrency = Number.isFinite(concurrencyRaw)
    ? Math.max(1, Math.min(16, Math.floor(concurrencyRaw)))
    : 4;
  return { dryRun, limit, offset, concurrency };
}

function isPlainEvaluationJson(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function parseEnrichmentInput(sig: unknown): EnrichmentSignalsV1Input | null {
  if (!sig || typeof sig !== 'object' || Array.isArray(sig)) return null;
  const s = sig as Record<string, unknown>;
  const interests = Array.isArray(s.interestsTop3)
    ? s.interestsTop3.filter((x): x is string => typeof x === 'string')
    : [];
  return {
    dailyRhythm: typeof s.dailyRhythm === 'string' ? s.dailyRhythm : null,
    autonomyTogethernessDepth:
      typeof s.autonomyTogethernessDepth === 'string' ? s.autonomyTogethernessDepth : null,
    kidsTimeline: typeof s.kidsTimeline === 'string' ? s.kidsTimeline : null,
    conflictStyleDetail:
      typeof s.conflictStyleDetail === 'string' ? s.conflictStyleDetail : null,
    interestsTop3: interests,
  };
}

function interestsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function profileUnchanged(beforeIn: EnrichmentSignalsV1Input, after: EnrichmentSignalsV1): boolean {
  const core: (keyof EnrichmentSignalsV1)[] = [
    'dailyRhythm',
    'autonomyTogethernessDepth',
    'kidsTimeline',
    'conflictStyleDetail',
  ];
  for (const k of core) {
    const raw = beforeIn[k];
    const coerced = after[k];
    const rawStr = typeof raw === 'string' ? raw.trim() : '';
    if (coerced === null) {
      if (rawStr !== '') return false;
    } else {
      if (rawStr !== coerced) return false;
    }
  }
  const rawI = Array.isArray(beforeIn.interestsTop3)
    ? beforeIn.interestsTop3.filter((x): x is string => typeof x === 'string')
    : [];
  return interestsEqual(rawI, after.interestsTop3);
}

const CORE_FIELDS = [
  'dailyRhythm',
  'autonomyTogethernessDepth',
  'kidsTimeline',
  'conflictStyleDetail',
] as const satisfies readonly (keyof EnrichmentSignalsV1)[];

type CoreField = (typeof CORE_FIELDS)[number];

function hasDroppedField(beforeIn: EnrichmentSignalsV1Input, after: EnrichmentSignalsV1): boolean {
  for (const k of CORE_FIELDS) {
    const raw = beforeIn[k];
    if (typeof raw === 'string' && raw.trim() !== '' && after[k] === null) return true;
  }
  return false;
}

function recordFieldDrops(
  input: EnrichmentSignalsV1Input,
  after: EnrichmentSignalsV1,
  profileId: string,
  byField: Record<CoreField, Array<{ id: string; rawValue: string }>>,
): void {
  for (const k of CORE_FIELDS) {
    const raw = input[k];
    if (typeof raw === 'string' && raw.trim() !== '' && after[k] === null) {
      const arr = byField[k];
      if (arr.length < 10) arr.push({ id: profileId, rawValue: raw.slice(0, 160) });
    }
  }
}

async function main(): Promise<void> {
  const { dryRun, limit, offset, concurrency } = parseArgs();
  const prisma = new PrismaClient();

  let total = 0;
  let unchanged = 0;
  let fixed = 0;
  let dropped = 0;
  let skippedNoEnrichment = 0;
  let failed = 0;
  const dropSamplesByField: Record<CoreField, Array<{ id: string; rawValue: string }>> = {
    dailyRhythm: [],
    autonomyTogethernessDepth: [],
    kidsTimeline: [],
    conflictStyleDetail: [],
  };

  try {
    const rows = await prisma.userProfile.findMany({
      where: { evaluationRaw: { isNot: null } },
      select: { id: true, evaluationRaw: { select: { evaluation: true } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      ...(limit != null ? { skip: offset, take: limit } : offset > 0 ? { skip: offset } : {}),
    });

    const queue = [...rows];
    let cursor = 0;

    async function worker(): Promise<void> {
      while (true) {
        const i = cursor;
        cursor += 1;
        if (i >= queue.length) return;
        const row = queue[i];
        try {
          const ev = row.evaluationRaw?.evaluation;
          if (!isPlainEvaluationJson(ev)) {
            skippedNoEnrichment += 1;
            continue;
          }
          const en = ev.enrichment;
          if (!en || typeof en !== 'object' || Array.isArray(en) || (en as { version?: string }).version !== 'v1') {
            skippedNoEnrichment += 1;
            continue;
          }
          const sig = (en as { signals?: unknown }).signals;
          const input = parseEnrichmentInput(sig);
          if (!input) {
            skippedNoEnrichment += 1;
            continue;
          }

          total += 1;
          const after = sanitizeEnrichmentSignalsV1(input);
          const wrapped = wrapEnrichmentV1(after);

          recordFieldDrops(input, after, row.id, dropSamplesByField);

          if (profileUnchanged(input, after)) {
            unchanged += 1;
            continue;
          }

          if (hasDroppedField(input, after)) {
            dropped += 1;
          } else {
            fixed += 1;
          }

          if (!dryRun) {
            const merged = {
              ...ev,
              enrichment: wrapped,
            } as unknown as Prisma.InputJsonValue;
            await prisma.profileEvaluationRaw.update({
              where: { profileId: row.id },
              data: { evaluation: merged },
            });
          }
        } catch {
          failed += 1;
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    console.log(
      JSON.stringify(
        {
          dryRun,
          limit: limit ?? 'ALL',
          offset,
          totalProfilesWithEnrichment: total,
          skippedNoEnrichment,
          failed,
          unchanged,
          fixed,
          dropped,
          persisted: dryRun ? 0 : fixed + dropped,
          dropSamplesByField,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
