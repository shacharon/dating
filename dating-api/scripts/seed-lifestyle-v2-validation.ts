import 'dotenv/config';

/**
 * Seeds 40 synthetic profiles (synthetic-ls-v2-001 … 040) with aboutMe/aboutPartner phrases
 * targeting lifestyleSignals v1+v2 extraction. Mirrors CI minimal HG seed shape (eval + snapshot).
 *
 * Run: npx ts-node scripts/seed-lifestyle-v2-validation.ts
 * Requires DATABASE_URL. Idempotent upserts.
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
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

const PREFIX = 'synthetic-ls-v2-';
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

/** 32 rich + 8 sparse ≈ 80% with ≥1 lifestyle tag after extract. */
function fixtureForIndex(i: number): { aboutMe: string; aboutPartner: string } {
  if (i >= 33) {
    return {
      aboutMe: 'Quiet professional who values clear communication and steady routines.',
      aboutPartner: 'Someone kind and reliable; no strong hobby preferences listed.',
    };
  }

  const cycle = ((i - 1) % 11) + 1;
  const partners = [
    '',
    'Looking for someone who enjoys hiking on weekends.',
    'Partner should love swimming or the pool.',
    'Hope you are a total homebody for cozy nights in.',
    'Want a social life with friends on weekends.',
  ];
  const p = partners[i % partners.length]!;

  switch (cycle) {
    case 1:
      return {
        aboutMe: 'I hit the gym often and enjoy yoga flows after work.',
        aboutPartner: p,
      };
    case 2:
      return {
        aboutMe: 'Wanderlust — love to travel, weekend trips, and updating my passport.',
        aboutPartner: p,
      };
    case 3:
      return {
        aboutMe: 'Foodie who loves cooking, brunch, and trying new restaurants.',
        aboutPartner: p,
      };
    case 4:
      return {
        aboutMe: 'Nightlife fan: nightclubs, a good night out, and dancing.',
        aboutPartner: p,
      };
    case 5:
      return {
        aboutMe: 'Dog mom; love cats, kittens, and calling them fur babies.',
        aboutPartner: p,
      };
    case 6:
      return {
        aboutMe: 'Avid reader with a kindle; I read a lot of novels and audiobooks.',
        aboutPartner: p,
      };
    case 7:
      return {
        aboutMe: 'PC gaming and video games on weekends; casual esports fan.',
        aboutPartner: p,
      };
    case 8:
      return {
        aboutMe: 'Competitive swimmer — laps at the pool every morning.',
        aboutPartner: p,
      };
    case 9:
      return {
        aboutMe: 'Nature and hiking; camping near national parks.',
        aboutPartner: p,
      };
    case 10:
      return {
        aboutMe: 'Total homebody — cozy at home and likes staying home.',
        aboutPartner: p,
      };
    default:
      return {
        aboutMe: 'Weekends with friends; dinner with friends and a rich social life.',
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
        .update(`${aboutMe}|${aboutPartner}|`, 'utf8')
        .digest('hex')
        .slice(0, 16);

      await prisma.userProfile.upsert({
        where: { id },
        create: {
          id,
          name: `LSv2 ${id}`,
          aboutMe,
          aboutPartner,
          aboutRelationship: '',
          holyGrailStructuredFacts: { ...HOLY_GRAIL_FACTS },
          holyGrailStructuredPreferences: {},
        },
        update: {
          name: `LSv2 ${id}`,
          aboutMe,
          aboutPartner,
          aboutRelationship: '',
          holyGrailStructuredFacts: { ...HOLY_GRAIL_FACTS },
          holyGrailStructuredPreferences: {},
        },
      });

      await prisma.profileEvaluation.upsert({
        where: { profileId: id },
        create: { profileId: id, evaluatedAt: new Date(), promptVersion: 'lsv2', policyVersion: 'lsv2', textHash },
        update: { evaluatedAt: new Date(), textHash },
      });

      const dr = stablePick(id, 'dr', ENRICHMENT_DAILY_RHYTHM_LABELS);
      const at = stablePick(id, 'at', ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS);
      const interestsTop3 = [`lsv2_${i}`, 'hiking', 'music'];

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
          promptVersion: 'lsv2_fixture',
          textHash,
          extractionJson: { lsv2: true, profileId: id },
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
          promptVersion: 'lsv2_fixture',
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
      `seed-lifestyle-v2-validation: upserted ${COUNT} profiles (${PREFIX}001–${String(COUNT).padStart(3, '0')})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
