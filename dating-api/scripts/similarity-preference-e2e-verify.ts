/**
 * End-to-end chain: free-text extraction → DB JSON parse → canonical map → wire preferences DTO → HG rank.
 * Run from repo: npx ts-node scripts/similarity-preference-e2e-verify.ts
 */
import type { MatchingCanonicalModel, MatchingRankingSignalsSnapshot } from '../src/canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from '../src/holy-grail-matching/holy-grail-five-signal-ranking';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import { parseHolyGrailStructuredPreferencesFromJson } from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { mapMatchingPreferencesToWireDto } from '../src/holy-grail-matching/retrieval/holy-grail-retrieval-wire.dto';
import { extractSimilarityPreferenceFromFreeText } from '../src/holy-grail-matching/similarity-preference-text.extract';

const rankingSignals: MatchingRankingSignalsSnapshot = {
  dailyRhythm: 'early',
  autonomyTogetherness: 'balanced',
  conflictStyle: 6,
  lifestylePace: 5,
  interestsTop: ['run', 'read', 'cook'],
};

/** Same signals on both sides → mean pairwise overlap O = 1 → strong contrast across pref modes. */
const candidateRankingSignals: MatchingRankingSignalsSnapshot = {
  dailyRhythm: 'early',
  autonomyTogetherness: 'balanced',
  conflictStyle: 6,
  lifestylePace: 5,
  interestsTop: ['run', 'read', 'cook'],
};

function canonicalSearcher(profileId: string, structuredPreferences: Record<string, unknown>): MatchingCanonicalModel {
  const parsed = parseHolyGrailStructuredPreferencesFromJson(structuredPreferences);
  return mapProfileSourceToMatchingCanonical({
    profileId,
    structuredPreferences: parsed,
    rankingSignals,
  });
}

function canonicalCandidate(profileId: string): MatchingCanonicalModel {
  return mapProfileSourceToMatchingCanonical({
    profileId,
    rankingSignals: candidateRankingSignals,
  });
}

const scenarios = [
  {
    key: 'similar' as const,
    textFields: { aboutPartner: 'I want someone similar to me.' },
  },
  {
    key: 'different' as const,
    textFields: { aboutPartner: 'I want someone different from me.' },
  },
  {
    key: 'balanced' as const,
    textFields: { aboutPartner: 'Not exactly like me — somewhere in the middle.' },
  },
];

function main(): void {
  const cand = canonicalCandidate('candidate-e2e');

  for (const sc of scenarios) {
    const extraction = extractSimilarityPreferenceFromFreeText(sc.textFields);
    if (extraction.value !== sc.key) {
      throw new Error(`Expected extraction ${sc.key}, got ${String(extraction.value)} evidence=${JSON.stringify(extraction.evidence)}`);
    }

    const dbJson = { similarityPreference: extraction.value };
    const searcher = canonicalSearcher(`searcher-e2e-${sc.key}`, dbJson);
    const rank = computeHolyGrailFiveSignalRank({ searcher, candidate: cand });
    const wirePrefs = mapMatchingPreferencesToWireDto(searcher.preferences);

    const simRow = rank.rankBreakdown.find((b) => b.signal === 'similarityPreference');

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          mode: sc.key,
          freeText: sc.textFields,
          extraction: { value: extraction.value, evidence: extraction.evidence },
          dbJson,
          canonicalPreferencesSimilarity: searcher.preferences.similarityPreference,
          wirePreferencesSimilarity: wirePrefs.similarityPreference,
          rankScore: rank.rankScore,
          similarityBreakdown: simRow ?? null,
          similarityRankReasonLine: rank.rankReasons.find((r) => r.startsWith('similarityPreference:')) ?? null,
        },
        null,
        2,
      ),
    );
    // eslint-disable-next-line no-console
    console.log('---');
  }
}

main();
