/**
 * E2E: personality trait extraction → mapping input → canonical → HG rank + rankReasons.
 * Run from dating-api: npx ts-node -r tsconfig-paths/register scripts/personality-traits-e2e-verify.ts
 * (or: npx ts-node scripts/personality-traits-e2e-verify.ts if paths resolve)
 */
import type { MatchingCanonicalModel } from '../src/canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from '../src/holy-grail-matching/holy-grail-five-signal-ranking';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import { extractPersonalityTraitsFromFreeText } from '../src/holy-grail-matching/personality-traits-text.extract';
import { buildHolyGrailProfileMappingInputFromDbRow } from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';

const EMPTY_EXTRACTION = {
  interests_self: [] as string[],
  interests: [] as string[],
  lifestyleTraits: [] as string[],
};

const BASE_RANK = {
  dailyRhythm: null,
  autonomyTogetherness: null,
  conflictStyle: null,
  lifestylePace: null,
  interestsTop: [] as string[],
} as const;

function canonicalFromText(
  profileId: string,
  aboutMe: string,
  aboutPartner: string,
): MatchingCanonicalModel {
  const input = buildHolyGrailProfileMappingInputFromDbRow({
    profileId,
    extractionV2: EMPTY_EXTRACTION,
    holyGrailStructuredFacts: {},
    holyGrailStructuredPreferences: {},
    signalSelf: null,
    aboutMe,
    aboutPartner,
  });
  const m = mapProfileSourceToMatchingCanonical(input);
  return {
    ...m,
    rankingSignals: {
      ...BASE_RANK,
      ...m.rankingSignals,
    },
  };
}

function main(): void {
  const aboutMeS = 'I like hiking.';
  const aboutPartnerS = 'No liars — want honesty.';
  const extS = extractPersonalityTraitsFromFreeText({ aboutMe: aboutMeS, aboutPartner: aboutPartnerS });
  if (extS.self.tags.length !== 0 || extS.partner.tags.join(',') !== 'honesty_integrity') {
    throw new Error(`unexpected extraction for searcher text: ${JSON.stringify(extS)}`);
  }

  const aboutMeC = 'I am honest and straightforward.';
  const aboutPartnerC = 'Someone playful.';
  const extC = extractPersonalityTraitsFromFreeText({ aboutMe: aboutMeC, aboutPartner: aboutPartnerC });
  if (extC.self.tags.join(',') !== 'honesty_integrity' || extC.partner.tags.join(',') !== 'humor_playful') {
    throw new Error(`unexpected extraction for candidate text: ${JSON.stringify(extC)}`);
  }

  const searcher = canonicalFromText('e2e-searcher', aboutMeS, aboutPartnerS);
  const candidate = canonicalFromText('e2e-candidate', aboutMeC, aboutPartnerC);
  const rank = computeHolyGrailFiveSignalRank({ searcher, candidate });

  const pRow = rank.rankBreakdown.find((b) => b.signal === 'personalityTraits');
  const pReason = rank.rankReasons.find((r) => r.startsWith('personalityTraits:'));

  if (!pRow || !pReason) {
    throw new Error('expected personalityTraits breakdown and rankReason line');
  }
  if (!pRow.note.startsWith('personalityTraits:grounded(')) {
    throw new Error(`bad personality note: ${pRow.note}`);
  }
  if (!pReason.includes('grounded(')) {
    throw new Error(`rankReason missing grounded fragment: ${pReason}`);
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        searcherExtraction: extS,
        candidateExtraction: extC,
        searcherRankingTraits: {
          self: searcher.rankingSignals?.personalityTraitsSelf ?? [],
          partner: searcher.rankingSignals?.personalityTraitsPartner ?? [],
        },
        candidateRankingTraits: {
          self: candidate.rankingSignals?.personalityTraitsSelf ?? [],
          partner: candidate.rankingSignals?.personalityTraitsPartner ?? [],
        },
        rankScore: rank.rankScore,
        personalityBreakdown: pRow,
        personalityRankReasonLine: pReason,
      },
      null,
      2,
    ),
  );
}

main();
