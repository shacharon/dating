import 'dotenv/config';

/**
 * Seeds 40 synthetic profiles (synthetic-interest-tags-v2-001 … 040) with aboutMe/aboutPartner phrases
 * targeting interestTags v1+v2 extraction. Same HG fixture shape as `seed-lifestyle-v2-validation.ts`.
 *
 * Run: npm run seed:interest-tags-v2-validation
 * Requires DATABASE_URL. Idempotent upserts.
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS,
  ENRICHMENT_DAILY_RHYTHM_LABELS,
} from '../../../src/evaluate/enrichment-canonical-labels';
import type { EvaluateBatchResult } from '../../../src/evaluate/evaluate.service';
import { composeHolyGrailRankingSignalsForPersist } from '../../../src/holy-grail-matching/holy-grail-ranking-signals-from-db';
import { INTEREST_TAGS_V2_VALIDATION_ID_PREFIX } from './interest-tags-v2-validation.constants';

export { INTEREST_TAGS_V2_VALIDATION_ID_PREFIX };

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

const PREFIX = INTEREST_TAGS_V2_VALIDATION_ID_PREFIX;
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

/** 32 profiles rotating interest phrases; 8 neutral (no allowlisted interest tokens). */
function fixtureForIndex(i: number): { aboutMe: string; aboutPartner: string } {
  if (i >= 33) {
    return {
      aboutMe: 'Quiet professional with a structured week and predictable pace.',
      aboutPartner: 'Prefers simplicity and practical plans without hype.',
    };
  }

  const cycle = ((i - 1) % 10) + 1;
  const partnerScopes = [
    '',
    'Enjoys cinema and Netflix nights.',
    'Loves concerts and playlists.',
    'Book club and audiobooks are a plus.',
    'Soccer and running together would be great.',
    'Gallery openings on weekends.',
    'Casual gaming and board games.',
    'Brunch and cooking at home.',
    'Passport-ready with wanderlust.',
    'DSLR photography walks.',
    'Open source and coding projects.',
  ];
  const p = partnerScopes[i % partnerScopes.length]!;

  switch (cycle) {
    case 1:
      return {
        aboutMe: 'Love live music, vinyl, and weekend concerts.',
        aboutPartner: p,
      };
    case 2:
      return {
        aboutMe: 'Movies, cinema nights, and Netflix marathons.',
        aboutPartner: p,
      };
    case 3:
      return {
        aboutMe: 'Book club, novels, and audiobooks on repeat.',
        aboutPartner: p,
      };
    case 4:
      return {
        aboutMe: 'Soccer on Sundays and a spring marathon.',
        aboutPartner: p,
      };
    case 5:
      return {
        aboutMe: 'Gallery nights and modern art.',
        aboutPartner: p,
      };
    case 6:
      return {
        aboutMe: 'Video games on weekends and board games with friends.',
        aboutPartner: p,
      };
    case 7:
      return {
        aboutMe: 'Love cooking, brunch, and trying new cuisine.',
        aboutPartner: p,
      };
    case 8:
      return {
        aboutMe: 'Wanderlust, passport stamps, and weekend trips.',
        aboutPartner: p,
      };
    case 9:
      return {
        aboutMe: 'Photography hobby with a DSLR and weekend shoots.',
        aboutPartner: p,
      };
    default:
      return {
        aboutMe: 'Software engineer into coding and open source.',
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
        .update(`${aboutMe}|${aboutPartner}|interest-tags-v2`, 'utf8')
        .digest('hex')
        .slice(0, 16);

      await prisma.matchmakingProfile.upsert({
        where: { id },
        create: {
          id,
          name: `ITagsV2 ${id}`,
          aboutMe,
          aboutPartner,
          aboutRelationship: '',
          holyGrailStructuredFacts: { ...HOLY_GRAIL_FACTS },
          holyGrailStructuredPreferences: {},
        },
        update: {
          name: `ITagsV2 ${id}`,
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
          promptVersion: 'interest-tags-v2',
          policyVersion: 'interest-tags-v2',
          textHash,
        },
        update: { evaluatedAt: new Date(), textHash },
      });

      const dr = stablePick(id, 'dr', ENRICHMENT_DAILY_RHYTHM_LABELS);
      const at = stablePick(id, 'at', ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS);
      const interestsTop3 = [`itagsv2_${i}`, 'hiking', 'music'];

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
          promptVersion: 'interest-tags-v2_fixture',
          textHash,
          extractionJson: { interestTagsV2Validation: true, profileId: id },
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
          promptVersion: 'interest-tags-v2_fixture',
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
      `seed-interest-tags-v2-validation: upserted ${COUNT} profiles (${PREFIX}001–${String(COUNT).padStart(3, '0')})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
