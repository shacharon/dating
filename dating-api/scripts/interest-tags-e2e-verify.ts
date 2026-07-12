/**
 * E2E: interest tag v1 extraction → mapping input → canonical → HG rank + interestTags rankReasons.
 * Run from dating-api: npx ts-node scripts/interest-tags-e2e-verify.ts
 */
import type { MatchingCanonicalModel } from '../src/canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from '../src/holy-grail-matching/holy-grail-five-signal-ranking';
import { extractInterestTagsV1FromFreeText } from '../src/holy-grail-matching/interest-tags-text.extract';
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
  const aboutMeS = 'Quiet weekends.';
  const aboutPartnerS = 'Someone into concerts and playlists.';
  const extS = extractInterestTagsV1FromFreeText({ aboutMe: aboutMeS, aboutPartner: aboutPartnerS });
  assertTagsEqual(extS.self.tags, []);
  assertTagsEqual(extS.partner.tags, ['music']);

  const aboutMeC = 'I love instruments and vinyl.';
  const aboutPartnerC = 'Netflix on weeknights.';
  const extC = extractInterestTagsV1FromFreeText({ aboutMe: aboutMeC, aboutPartner: aboutPartnerC });
  assertTagsEqual(extC.self.tags, ['music']);
  assertTagsEqual(extC.partner.tags, ['film']);

  const searcher = canonicalFromText('e2e-it-searcher', aboutMeS, aboutPartnerS);
  const candidate = canonicalFromText('e2e-it-candidate', aboutMeC, aboutPartnerC);
  const rank = computeHolyGrailFiveSignalRank({ searcher, candidate });

  const itRow = rank.rankBreakdown.find((b) => b.signal === 'interestTags');
  const itReason = rank.rankReasons.find((r) => r.startsWith('interestTags:'));

  if (!itRow || !itReason) {
    throw new Error('expected interestTags breakdown and rankReason line');
  }
  if (!itRow.note.startsWith('interestTags:grounded(')) {
    throw new Error(`bad interestTags note: ${itRow.note}`);
  }
  if (!itRow.note.includes('music')) {
    throw new Error(`note must mention matched tag music: ${itRow.note}`);
  }
  if (itRow.note.includes('film')) {
    throw new Error('explanation must not name tags that did not intersect for this pair');
  }
  if (!itReason.includes('grounded(')) {
    throw new Error(`rankReason missing grounded fragment: ${itReason}`);
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        searcherExtraction: extS,
        candidateExtraction: extC,
        searcherInterestRanking: {
          self: searcher.rankingSignals?.interestTagsSelf ?? [],
          partner: searcher.rankingSignals?.interestTagsPartner ?? [],
        },
        candidateInterestRanking: {
          self: candidate.rankingSignals?.interestTagsSelf ?? [],
          partner: candidate.rankingSignals?.interestTagsPartner ?? [],
        },
        rankScore: rank.rankScore,
        interestTagsBreakdown: itRow,
        interestTagsRankReasonLine: itReason,
      },
      null,
      2,
    ),
  );
}

main();
