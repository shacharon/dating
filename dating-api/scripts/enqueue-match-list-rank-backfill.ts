/**
 * Sprint 31 Story 5 — enqueue MatchListRank rebuilds for all list-ready viewers.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/enqueue-match-list-rank-backfill.ts --dry-run
 *   npx ts-node --project tsconfig.json scripts/enqueue-match-list-rank-backfill.ts
 *
 * Requires REDIS_URL (Bull). Delay between enqueues: MATCH_LIST_BACKFILL_DELAY_MS (default 200).
 */
import 'dotenv/config';
import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import {
  matchListRankBackfillViewerWhere,
  resolveMatchListBackfillDelayMs,
} from '../src/me-profile/match-list-rank-backfill';
import {
  MATCH_LIST_RANK_QUEUE,
  matchListRankRebuildJobId,
  type MatchListRankRebuildJobData,
} from '../src/workers/match-list-rank.queue';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const delayMs = resolveMatchListBackfillDelayMs();
  const prisma = new PrismaClient();

  const viewers = await prisma.userProfile.findMany({
    where: matchListRankBackfillViewerWhere(),
    select: { userId: true, id: true },
    orderBy: { id: 'asc' },
  });

  console.log(
    `match-list-rank backfill: ${viewers.length} ANALYZED viewers with approved photo` +
      (dryRun ? ' (dry-run)' : ''),
  );
  const sample = viewers.slice(0, 5).map((v) => v.userId);
  if (sample.length) {
    console.log(`sample userIds: ${sample.join(', ')}`);
  }

  if (dryRun) {
    await prisma.$disconnect();
    return;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    console.error('REDIS_URL is required to enqueue Bull jobs');
    await prisma.$disconnect();
    process.exit(1);
  }

  const queue = new Queue<MatchListRankRebuildJobData>(
    MATCH_LIST_RANK_QUEUE,
    redisUrl,
  );

  let enqueued = 0;
  let coalesced = 0;
  try {
    for (const v of viewers) {
      const jobId = matchListRankRebuildJobId(v.userId);
      try {
        await queue.add(
          { viewerUserId: v.userId, reason: 'backfill' },
          {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60_000 },
          },
        );
        enqueued += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/already exists|Job.*exists/i.test(msg)) {
          coalesced += 1;
        } else {
          throw err;
        }
      }
      if (delayMs > 0) await sleep(delayMs);
    }
  } finally {
    await queue.close();
    await prisma.$disconnect();
  }

  console.log(
    `done: enqueued=${enqueued} coalesced=${coalesced} delayMs=${delayMs}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
