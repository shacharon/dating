/**
 * Force full profile analysis (evaluateBatch + Prisma persist + ProfileExtractionV2) for
 * real DB profiles only, then rebuild match JSON via MatchDaemonService (same engine as daemon).
 *
 * Real = same rules as scripts/match-audit-15.ts (handmade seed IDs + id/name heuristics).
 * Pass --include-nonreal to analyze every profile in the DB (including test/stub/handmade).
 *
 * Run from dating-api (DATABASE_URL + LLM keys as for the API):
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/reanalyze-real-and-rebuild-matches.ts
 * Optional: --limit=N --delay-ms=150 --min-about-me-chars=20 --skip-matches
 *           --matches-only  (rebuild match JSON/index only; no profile LLM re-runs)
 */

import { createHash } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import type { EvaluateBatchResult } from '../src/evaluate/evaluate.service';
import { EvaluateService } from '../src/evaluate/evaluate.service';
import { ExtractionV2PersistenceService } from '../src/extraction/extraction-v2-persistence.service';
import { MatchDaemonService } from '../src/matches/match-daemon.service';
import { ProfilesPrismaService } from '../src/profiles/profiles-prisma.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { HANDMADE_PROFILES } from './handmade-profiles.data';

const PROMPT_VERSION = 'v1';
const POLICY_VERSION = 'product-score-v1';

function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

function parseArgs(): {
  includeNonreal: boolean;
  limit?: number;
  delayMs: number;
  minAboutMeChars: number;
  skipMatches: boolean;
  matchesOnly: boolean;
} {
  const args = process.argv.slice(2);
  const byKey = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg?.startsWith('--')) continue;
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
  const includeNonreal = (byKey.get('include-nonreal') || 'false').toLowerCase() === 'true';
  const limitRaw = byKey.get('limit');
  const limit =
    limitRaw && Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : undefined;
  const delayMsRaw = Number(byKey.get('delay-ms') || '150');
  const delayMs = Number.isFinite(delayMsRaw) ? Math.max(0, Math.min(5000, delayMsRaw)) : 150;
  const minRaw = Number(byKey.get('min-about-me-chars') ?? '20');
  const minAboutMeChars = Number.isFinite(minRaw) ? Math.max(0, Math.floor(minRaw)) : 20;
  const skipMatches = (byKey.get('skip-matches') || 'false').toLowerCase() === 'true';
  const matchesOnly = (byKey.get('matches-only') || 'false').toLowerCase() === 'true';
  return { includeNonreal, limit, delayMs, minAboutMeChars, skipMatches, matchesOnly };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface EnrichmentSignalsSnap {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  interestsTop3: string[];
}

function snapFromEvaluation(evaluation: unknown): EnrichmentSignalsSnap | null {
  if (!evaluation || typeof evaluation !== 'object') return null;
  const ev = evaluation as Record<string, unknown>;
  const en = ev.enrichment;
  if (!en || typeof en !== 'object' || Array.isArray(en)) return null;
  const o = en as Record<string, unknown>;
  if (o.version !== 'v1') return null;
  const sig = o.signals;
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

function enrichmentDelta(
  before: EnrichmentSignalsSnap | null,
  after: EnrichmentSignalsSnap | null,
): Record<string, { before: unknown; after: unknown }> {
  const keys = [
    'dailyRhythm',
    'autonomyTogethernessDepth',
    'kidsTimeline',
    'conflictStyleDetail',
    'interestsTop3',
  ] as const;
  const out: Record<string, { before: unknown; after: unknown }> = {};
  for (const k of keys) {
    const b = before?.[k];
    const a = after?.[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      out[k] = { before: b ?? null, after: a ?? null };
    }
  }
  return out;
}

function isRealProfileRow(
  id: string,
  name: string,
  handmadeIds: ReadonlySet<string>,
  includeNonreal: boolean,
): boolean {
  if (includeNonreal) return true;
  if (handmadeIds.has(id)) return false;
  if (/^(demo|test|stub|seed|handmade_)/i.test(id)) return false;
  if (/(demo|test user|stub|handmade|seed|placeholder)/i.test(name)) return false;
  return true;
}

async function selectTargetIds(
  prisma: PrismaService,
  opts: {
    includeNonreal: boolean;
    limit?: number;
    minAboutMeChars: number;
  },
): Promise<{
  targetIds: string[];
  skippedNonReal: number;
  skippedShortText: number;
  eligibleCount: number;
}> {
  const handmadeIds = new Set(HANDMADE_PROFILES.map((p) => p.id));
  const rows = await prisma.$queryRaw<{ id: string; name: string; aboutMe: string }[]>`
    SELECT id, name, "aboutMe"
    FROM "UserProfile"
    ORDER BY id ASC
  `;

  let skippedNonReal = 0;
  let skippedShortText = 0;
  const eligible: string[] = [];

  for (const row of rows) {
    if (!isRealProfileRow(row.id, row.name, handmadeIds, opts.includeNonreal)) {
      skippedNonReal += 1;
      continue;
    }
    const len = (row.aboutMe ?? '').trim().length;
    if (opts.minAboutMeChars > 0 && len < opts.minAboutMeChars) {
      skippedShortText += 1;
      continue;
    }
    eligible.push(row.id);
  }

  const eligibleCount = eligible.length;
  const targetIds = opts.limit ? eligible.slice(0, opts.limit) : eligible;
  return { targetIds, skippedNonReal, skippedShortText, eligibleCount };
}

async function forceAnalyzeOne(
  profileId: string,
  profilesPrisma: ProfilesPrismaService,
  evaluateService: EvaluateService,
  extractionV2Persistence: ExtractionV2PersistenceService,
): Promise<{ evaluation: EvaluateBatchResult }> {
  const profile = await profilesPrisma.getById(profileId);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const { result: evaluation } = await evaluateService.evaluateBatch({
    aboutMe: profile.texts.aboutMe,
    aboutRelationship: profile.texts.aboutRelationship,
    aboutPartner: profile.texts.aboutPartner,
    profileId: profile.id,
  });

  const updatedAt = new Date().toISOString();
  const policyVersionSaved = evaluation.productScores?.policyVersion ?? POLICY_VERSION;

  const textConcat =
    (profile.texts.aboutMe ?? '') +
    '|' +
    (profile.texts.aboutPartner ?? '') +
    '|' +
    (profile.texts.aboutRelationship ?? '');
  const textHash = hashText(textConcat);

  await profilesPrisma.save(profile.id, {
    id: profile.id,
    name: profile.name,
    texts: profile.texts,
    evaluation,
    evaluationStatus: 'DONE',
    evaluatedAt: updatedAt,
    promptVersion: PROMPT_VERSION,
    policyVersion: policyVersionSaved,
    textHash,
    signals: evaluation.self.signals,
  });

  await extractionV2Persistence.saveExtendedSignalsFromEvaluation({
    profileId: profile.id,
    aboutMe: profile.texts.aboutMe,
    aboutPartner: profile.texts.aboutPartner,
    aboutRelationship: profile.texts.aboutRelationship,
    evaluation,
  });

  return { evaluation };
}

async function main(): Promise<void> {
  const { includeNonreal, limit, delayMs, minAboutMeChars, skipMatches, matchesOnly } =
    parseArgs();

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const profilesPrisma = app.get(ProfilesPrismaService);
  const evaluateService = app.get(EvaluateService);
  const extractionV2Persistence = app.get(ExtractionV2PersistenceService);
  const matchDaemon = app.get(MatchDaemonService);

  let analyzed = 0;
  let failed = 0;
  let skippedNonReal = 0;
  let skippedShortText = 0;
  let skippedDueToLimit = 0;
  let eligibleCount = 0;
  const failures: Array<{ profileId: string; reason: string }> = [];
  const withDelta: Array<{
    profileId: string;
    name: string;
    delta: Record<string, { before: unknown; after: unknown }>;
  }> = [];
  const noDelta: Array<{
    profileId: string;
    name: string;
    delta: Record<string, { before: unknown; after: unknown }>;
  }> = [];

  if (!matchesOnly) {
    const selected = await selectTargetIds(prisma, {
      includeNonreal,
      limit,
      minAboutMeChars,
    });
    skippedNonReal = selected.skippedNonReal;
    skippedShortText = selected.skippedShortText;
    eligibleCount = selected.eligibleCount;
    const targetIds = selected.targetIds;
    skippedDueToLimit =
      limit != null && eligibleCount > targetIds.length ? eligibleCount - targetIds.length : 0;

    console.log(
      JSON.stringify({
        phase: 'start',
        includeNonreal,
        limit: limit ?? null,
        delayMs,
        minAboutMeChars,
        skipMatches,
        matchesOnly: false,
        targetCount: targetIds.length,
        skippedNonReal,
        skippedShortText,
        skippedDueToLimit,
        eligibleCount,
      }),
    );

    for (let i = 0; i < targetIds.length; i += 1) {
      const id = targetIds[i]!;
      if (i > 0 && delayMs > 0) await delay(delayMs);

      const beforeProfile = await profilesPrisma.getById(id);
      const beforeSnap = snapFromEvaluation(beforeProfile?.evaluation);
      const label = beforeProfile?.name ?? id;

      try {
        const { evaluation } = await forceAnalyzeOne(
          id,
          profilesPrisma,
          evaluateService,
          extractionV2Persistence,
        );
        analyzed += 1;
        const afterSnap = snapFromEvaluation(evaluation);
        const delta = enrichmentDelta(beforeSnap, afterSnap);
        const row = { profileId: id, name: label, delta };
        if (Object.keys(delta).length > 0) withDelta.push(row);
        else if (noDelta.length < 20) noDelta.push(row);
      } catch (err) {
        failed += 1;
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ profileId: id, reason });
        console.error(JSON.stringify({ phase: 'analyze_fail', profileId: id, reason }));
      }
    }
  } else {
    console.log(JSON.stringify({ phase: 'start', matchesOnly: true, skipMatches }));
  }

  let matchCount = 0;
  let pairErrors = 0;
  if (!skipMatches) {
    const stats = await matchDaemon.runOnce();
    matchCount = stats.matchCount;
    pairErrors = stats.pairErrors;
  }

  const index = skipMatches ? null : await matchDaemon.getAutoIndex();
  const topMatches = (index?.items ?? []).slice(0, 10).map((it) => ({
    matchId: it.matchId,
    aId: it.a.id,
    aName: it.a.name,
    bId: it.b.id,
    bName: it.b.name,
    finalScore: it.finalScore ?? it.overall,
    coveragePercent: it.coveragePercent ?? null,
    coverageFactor: it.coverageFactor ?? null,
  }));

  await app.close();

  const enrichmentSamples = matchesOnly ? [] : [...withDelta, ...noDelta].slice(0, 10);
  const skippedTotal = matchesOnly
    ? 0
    : skippedNonReal + skippedShortText + skippedDueToLimit;

  const report = {
    generatedAt: new Date().toISOString(),
    matchesOnly,
    totalAnalyzed: analyzed,
    totalSkipped: skippedTotal,
    skippedBreakdown: matchesOnly
      ? null
      : {
          nonRealOrFiltered: skippedNonReal,
          shortAboutMe: skippedShortText,
          dueToLimit: skippedDueToLimit,
        },
    totalFailed: failed,
    totalMatchesRecomputed: matchCount,
    pairErrors,
    enrichmentSamples,
    topMatches,
    failures: failures.slice(0, 20),
  };

  console.log('');
  console.log('=== reanalyze-real-and-rebuild-matches (summary) ===');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
