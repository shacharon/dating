import 'dotenv/config';

/**
 * Seeds 40 synthetic profiles (synthetic-personality-v2-001 … 040) with aboutMe/aboutPartner phrases
 * targeting personalityTraits v1+v2 extraction. Same HG fixture shape as `seed-lifestyle-v2-validation.ts`.
 *
 * Run: npm run seed:personality-v2-validation
 * Requires DATABASE_URL. Idempotent upserts.
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PERSONALITY_V2_VALIDATION_ID_PREFIX } from './personality-v2-validation.constants';
import {
  ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS,
  ENRICHMENT_DAILY_RHYTHM_LABELS,
} from '../src/evaluate/enrichment-canonical-labels';
import type { EvaluateBatchResult } from '../src/evaluate/evaluate.service';
import { composeHolyGrailRankingSignalsForPersist } from '../src/holy-grail-matching/holy-grail-ranking-signals-from-db';

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

export { PERSONALITY_V2_VALIDATION_ID_PREFIX };

const PREFIX = PERSONALITY_V2_VALIDATION_ID_PREFIX;
const COUNT = 40;

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

/** 32 profiles with rotating personality phrases; 8 neutral (no allowlisted personality tokens). */
function fixtureForIndex(i: number): { aboutMe: string; aboutPartner: string } {
  if (i >= 33) {
    return {
      aboutMe: 'Quiet professional focused on clear communication and predictable routines.',
      aboutPartner: 'A grounded person; practical outlook without dramatics.',
    };
  }

  const cycle = ((i - 1) % 10) + 1;
  const partnerScopes = [
    '',
    'Looking for someone honest and straightforward.',
    'Want a partner who is funny and playful.',
    'Someone calm and patient would be ideal.',
    'Hoping you are loyal and dependable.',
    'Kindness and empathy matter most to me.',
    'Ambitious, driven types who still make time for us.',
    'Curious and open-minded about the world together.',
    'Optimistic outlook and positive energy.',
    'Comfortable being introverted together sometimes.',
    'Outgoing and social at gatherings.',
  ];
  const p = partnerScopes[i % partnerScopes.length]!;

  switch (cycle) {
    case 1:
      return {
        aboutMe: 'I am funny, witty, and playful with friends.',
        aboutPartner: p,
      };
    case 2:
      return {
        aboutMe: 'I value being honest, truthful, and transparent in relationships.',
        aboutPartner: p,
      };
    case 3:
      return {
        aboutMe: 'Kind heart and deeply caring toward people I love.',
        aboutPartner: p,
      };
    case 4:
      return {
        aboutMe: 'Ambitious, driven, and goal-oriented at work.',
        aboutPartner: p,
      };
    case 5:
      return {
        aboutMe: 'Calm, patient, and easy going day to day.',
        aboutPartner: p,
      };
    case 6:
      return {
        aboutMe: 'Curious and open minded about new perspectives.',
        aboutPartner: p,
      };
    case 7:
      return {
        aboutMe: 'Loyal, dependable, and a reliable friend.',
        aboutPartner: p,
      };
    case 8:
      return {
        aboutMe: 'Optimistic with a positive outlook on life.',
        aboutPartner: p,
      };
    case 9:
      return {
        aboutMe: 'Introverted and reflective; I recharge alone.',
        aboutPartner: p,
      };
    default:
      return {
        aboutMe: 'Extroverted, outgoing, and energized by people.',
        aboutPartner: p,
      };
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (let i = 1; i <= COUNT; i++) {
      const id = `${PREFIX}${String(i).padStart(3, '0')}`;
      const { aboutMe, aboutPartner } = fixtureForIndex(i);
      const textHash = createHash('sha256')
        .update(`${aboutMe}|${aboutPartner}|personality-v2`, 'utf8')
        .digest('hex')
        .slice(0, 16);

      await prisma.matchmakingProfile.upsert({
        where: { id },
        create: {
          id,
          name: `PersV2 ${id}`,
          aboutMe,
          aboutPartner,
          aboutRelationship: '',
          holyGrailStructuredFacts: { ...HOLY_GRAIL_FACTS },
          holyGrailStructuredPreferences: {},
        },
        update: {
          name: `PersV2 ${id}`,
          aboutMe,
          aboutPartner,
          aboutRelationship: '',
          holyGrailStructuredFacts: { ...HOLY_GRAIL_FACTS },
          holyGrailStructuredPreferences: {},
        },
      });

      await prisma.profileEvaluation.upsert({
        where: { profileId: id },
        create: {
          profileId: id,
          evaluatedAt: new Date(),
          promptVersion: 'personality-v2',
          policyVersion: 'personality-v2',
          textHash,
        },
        update: { evaluatedAt: new Date(), textHash },
      });

      const dr = stablePick(id, 'dr', ENRICHMENT_DAILY_RHYTHM_LABELS);
      const at = stablePick(id, 'at', ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS);
      const interestsTop3 = [`personality_v2_${i}`, 'hiking', 'music'];

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
          promptVersion: 'personality-v2_fixture',
          textHash,
          extractionJson: { personalityV2Validation: true, profileId: id },
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
          promptVersion: 'personality-v2_fixture',
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

    // eslint-disable-next-line no-console
    console.error(
      `seed-personality-v2-validation: upserted ${COUNT} profiles (${PREFIX}001–${String(COUNT).padStart(3, '0')})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
