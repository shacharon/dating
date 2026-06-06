/**
 * Inserts a minimal synthetic HG validation pool for CI (synthetic-en-001 … synthetic-en-025).
 * Sparse structured facts + extraction + enrichment + self signal snapshot so hg-full-system-validation
 * produces ranked rows and signal coverage metrics.
 *
 * Run automatically before `ci:hg-ranking-guard` in GitHub Actions; safe to re-run (idempotent upserts).
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS,
  ENRICHMENT_DAILY_RHYTHM_LABELS,
} from '../../../src/evaluate/enrichment-canonical-labels';
import type { EvaluateBatchResult } from '../../../src/evaluate/evaluate.service';
import { composeHolyGrailRankingSignalsForPersist } from '../../../src/holy-grail-matching/holy-grail-ranking-signals-from-db';

const HG_RANKING_KEYS_OMIT_FROM_EVAL_JSON = [
  'dailyRhythm',
  'autonomyTogethernessDepth',
  'interestsTop3',
  'autonomyTogetherness',
  'interestsTop',
] as const;

function stripHgRankingKeysFromEvalJsonForDb(evaluation: EvaluateBatchResult): EvaluateBatchResult {
  const c = JSON.parse(JSON.stringify(evaluation)) as EvaluateBatchResult;
  const en = c.enrichment;
  if (!en || en.version !== 'v1' || !en.signals || typeof en.signals !== 'object') return c;
  const sig = en.signals as unknown as Record<string, unknown>;
  for (const k of HG_RANKING_KEYS_OMIT_FROM_EVAL_JSON) delete sig[k];
  return c;
}

const COUNT = 25;
const PREFIX = 'synthetic-en-';

const HOLY_GRAIL_FACTS = {
  genderIdentity: 'MALE',
  dateOfBirth: '1990-05-15',
  childrenStatus: 'NO',
  wantsChildren: 'YES',
  smoking: 'NEVER',
  alcoholUse: 'RARE',
  education: 'BACHELORS',
  religion: 'JEWISH',
} as const;

function stablePick<T extends readonly string[]>(id: string, salt: string, arr: T): T[number] {
  const h = createHash('sha256').update(`${id}:${salt}`).digest();
  return arr[(h[0] ?? 0) % arr.length]!;
}

function stableFloat(id: string, salt: string, min: number, max: number): number {
  const h = createHash('sha256').update(`${id}:${salt}`).digest();
  const t = (h.readUInt32BE(0) >>> 0) / 0xffff_ffff;
  return Math.round((min + t * (max - min)) * 10) / 10;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (let i = 1; i <= COUNT; i++) {
      const id = `${PREFIX}${String(i).padStart(3, '0')}`;
      const aboutMe = `CI fixture profile ${id}. I enjoy reading, hiking, music, and weekend gym sessions.`;
      const textHash = createHash('sha256')
        .update(`${aboutMe}||`, 'utf8')
        .digest('hex')
        .slice(0, 16);

      await prisma.matchmakingProfile.upsert({
        where: { id },
        create: {
          id,
          name: `CI ${id}`,
          aboutMe,
          aboutPartner: '',
          aboutRelationship: '',
          holyGrailStructuredFacts: { ...HOLY_GRAIL_FACTS },
          holyGrailStructuredPreferences: {},
        },
        update: {
          name: `CI ${id}`,
          aboutMe,
          aboutPartner: '',
          aboutRelationship: '',
          holyGrailStructuredFacts: { ...HOLY_GRAIL_FACTS },
          holyGrailStructuredPreferences: {},
        },
      });

      await prisma.profileEvaluation.upsert({
        where: { profileId: id },
        create: { profileId: id, evaluatedAt: new Date(), promptVersion: 'ci', policyVersion: 'ci', textHash },
        update: { evaluatedAt: new Date(), textHash },
      });

      const dr = stablePick(id, 'dr', ENRICHMENT_DAILY_RHYTHM_LABELS);
      const at = stablePick(id, 'at', ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS);
      const interestsTop3 = [`interest_${i}`, 'hiking', 'music'];

      const lifestylePace = stableFloat(id, 'lp', 2, 9);
      const conflictStyle = stableFloat(id, 'cs', 3, 8);

      const interestsSelfSeed = ['reading', 'hiking', 'music', 'travel'] as const;

      const rankingSourceEval = {
        enrichment: {
          version: 'v1' as const,
          signals: {
            dailyRhythm: dr,
            autonomyTogethernessDepth: at,
            kidsTimeline: null,
            conflictStyleDetail: null,
            interestsTop3,
          },
        },
      } as EvaluateBatchResult;

      const evaluationForDb = stripHgRankingKeysFromEvalJsonForDb(rankingSourceEval);

      await prisma.profileEvaluationRaw.upsert({
        where: { profileId: id },
        create: {
          profileId: id,
          evaluation: evaluationForDb as object,
        },
        update: {
          evaluation: evaluationForDb as object,
        },
      });

      const composedRanking = composeHolyGrailRankingSignalsForPersist({
        evaluation: rankingSourceEval,
        interestsSelf: interestsSelfSeed,
        signalSelfNumerics: { lifestylePace, conflictStyle },
      });

      await prisma.profileExtractionV2.upsert({
        where: { profileId: id },
        create: {
          profileId: id,
          promptVersion: 'ci_fixture_v1',
          textHash,
          extractionJson: { ci: true, profileId: id },
          selfSignals: {},
          partnerSignals: {},
          relationshipSignals: {},
          coverageScore: 1,
          avgConfidence: 0.5,
          interests_self: [...interestsSelfSeed],
          interests: ['reading', 'hiking'],
          lifestyleTraits: ['outdoors'],
        },
        update: {
          promptVersion: 'ci_fixture_v1',
          textHash,
          interests_self: [...interestsSelfSeed],
          interests: ['reading', 'hiking'],
          lifestyleTraits: ['outdoors'],
        },
      });

      await prisma.profileSignalSnapshot.upsert({
        where: { profileId_domain: { profileId: id, domain: 'self' } },
        create: {
          profileId: id,
          domain: 'self',
          lifestylePace,
          conflictStyle,
          hgRankingDailyRhythm: composedRanking.dailyRhythm,
          hgRankingAutonomyTogetherness: composedRanking.autonomyTogetherness,
          hgRankingInterestsTop: [...composedRanking.interestsTop],
        },
        update: {
          lifestylePace,
          conflictStyle,
          hgRankingDailyRhythm: composedRanking.dailyRhythm,
          hgRankingAutonomyTogetherness: composedRanking.autonomyTogetherness,
          hgRankingInterestsTop: [...composedRanking.interestsTop],
        },
      });
    }

    console.error(`ci-seed-hg-validation-minimal: upserted ${COUNT} profiles (${PREFIX}001–${String(COUNT).padStart(3, '0')})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
