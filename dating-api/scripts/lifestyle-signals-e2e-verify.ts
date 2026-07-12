/**
 * E2E: lifestyle extraction → mapping input → canonical → HG rank + lifestyleSignals rankReasons.
 * Run from dating-api: npx ts-node scripts/lifestyle-signals-e2e-verify.ts
 */
import type { MatchingCanonicalModel } from '../src/canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from '../src/holy-grail-matching/holy-grail-five-signal-ranking';
import { extractLifestyleSignalsFromFreeText } from '../src/holy-grail-matching/lifestyle-signals-text.extract';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
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

function assertTagsEqual(a: readonly string[], b: readonly string[]): void {
  if ([...a].sort().join(',') !== [...b].sort().join(',')) {
    throw new Error(`expected tags ${JSON.stringify(b)} got ${JSON.stringify(a)}`);
  }
}

function main(): void {
  const aboutMeS = 'Thoughtful and curious about people.';
  const aboutPartnerS = 'Someone who loves hiking.';
  const extS = extractLifestyleSignalsFromFreeText({ aboutMe: aboutMeS, aboutPartner: aboutPartnerS });
  assertTagsEqual(extS.self.tags, []);
  assertTagsEqual(extS.partner.tags, ['outdoors_nature']);

  const aboutMeC = 'Hiking every weekend.';
  const aboutPartnerC = 'Social with friends.';
  const extC = extractLifestyleSignalsFromFreeText({ aboutMe: aboutMeC, aboutPartner: aboutPartnerC });
  assertTagsEqual(extC.self.tags, ['outdoors_nature']);
  assertTagsEqual(extC.partner.tags, ['social_friends']);

  const searcher = canonicalFromText('e2e-ls-searcher', aboutMeS, aboutPartnerS);
  const candidate = canonicalFromText('e2e-ls-candidate', aboutMeC, aboutPartnerC);
  const rank = computeHolyGrailFiveSignalRank({ searcher, candidate });

  const lsRow = rank.rankBreakdown.find((b) => b.signal === 'lifestyleSignals');
  const lsReason = rank.rankReasons.find((r) => r.startsWith('lifestyleSignals:'));

  if (!lsRow || !lsReason) {
    throw new Error('expected lifestyleSignals breakdown and rankReason line');
  }
  if (!lsRow.note.startsWith('lifestyleSignals:grounded(')) {
    throw new Error(`bad lifestyle note: ${lsRow.note}`);
  }
  if (!lsRow.note.includes('outdoors_nature')) {
    throw new Error(`note must mention matched tag outdoors_nature: ${lsRow.note}`);
  }
  if (lsRow.note.includes('social_friends')) {
    throw new Error('explanation must not name tags that did not intersect for this pair');
  }
  if (!lsReason.includes('grounded(')) {
    throw new Error(`rankReason missing grounded fragment: ${lsReason}`);
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        searcherExtraction: extS,
        candidateExtraction: extC,
        searcherLifestyleRanking: {
          self: searcher.rankingSignals?.lifestyleSignalsSelf ?? [],
          partner: searcher.rankingSignals?.lifestyleSignalsPartner ?? [],
        },
        candidateLifestyleRanking: {
          self: candidate.rankingSignals?.lifestyleSignalsSelf ?? [],
          partner: candidate.rankingSignals?.lifestyleSignalsPartner ?? [],
        },
        rankScore: rank.rankScore,
        lifestyleBreakdown: lsRow,
        lifestyleRankReasonLine: lsReason,
      },
      null,
      2,
    ),
  );
}

main();
