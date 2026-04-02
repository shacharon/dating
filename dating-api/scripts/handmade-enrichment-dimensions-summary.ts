/**
 * Handmade profile sweep: autonomyTogethernessDepth + interestsTop3 coverage only.
 *
 * Run from dating-api:
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/handmade-enrichment-dimensions-summary.ts
 */

import { HANDMADE_PROFILES } from './handmade-profiles.data';
import { buildEnrichmentSignalsV4 } from '../src/evaluate/enrichment-v4';

/** Post–V3 / pre–V4 snapshot (buildEnrichmentSignalsV3) captured 2026-04-01. */
const PRE_V4_BASELINE = {
  autonomy_non_null: 16,
  autonomy_pct: 53,
  autonomy_miss_ids: [
    'handmade_202604_02',
    'handmade_202604_06',
    'handmade_202604_08',
    'handmade_202604_09',
    'handmade_202604_10',
    'handmade_202604_12',
    'handmade_202604_16',
    'handmade_202604_18',
    'handmade_202604_19',
    'handmade_202604_20',
    'handmade_202604_21',
    'handmade_202604_22',
    'handmade_202604_25',
    'handmade_202604_26',
  ],
  interests_any_count: 22,
  interests_any_pct: 73,
  interests_miss_ids: [
    'handmade_202604_01',
    'handmade_202604_06',
    'handmade_202604_09',
    'handmade_202604_15',
    'handmade_202604_24',
    'handmade_202604_25',
    'handmade_202604_26',
    'handmade_202604_30',
  ],
};

function main() {
  const n = HANDMADE_PROFILES.length;
  let autonomyHits = 0;
  let interestsAny = 0;
  const autonomyMiss: string[] = [];
  const interestMiss: string[] = [];
  const improved: Array<{
    id: string;
    autonomy: string | null;
    interestsTop3: string[];
  }> = [];

  for (const p of HANDMADE_PROFILES) {
    const s = buildEnrichmentSignalsV4(p.aboutMe, p.aboutPartner, p.aboutRelationship);
    if (s.autonomyTogethernessDepth != null) autonomyHits++;
    else autonomyMiss.push(p.id);
    if (s.interestsTop3.length > 0) interestsAny++;
    else interestMiss.push(p.id);
    improved.push({
      id: p.id,
      autonomy: s.autonomyTogethernessDepth,
      interestsTop3: s.interestsTop3,
    });
  }

  console.log(
    JSON.stringify(
      {
        dimensions: ['autonomyTogethernessDepth', 'interestsTop3'],
        n,
        baseline_before_v4: PRE_V4_BASELINE,
        autonomy_non_null: autonomyHits,
        autonomy_pct: Math.round((100 * autonomyHits) / n),
        interests_any_count: interestsAny,
        interests_any_pct: Math.round((100 * interestsAny) / n),
        autonomy_miss_ids: autonomyMiss,
        interests_miss_ids: interestMiss,
        profiles_autonomy_improved_ids: PRE_V4_BASELINE.autonomy_miss_ids.filter(
          (id) => !autonomyMiss.includes(id),
        ),
        profiles_interests_improved_ids: PRE_V4_BASELINE.interests_miss_ids.filter(
          (id) => !interestMiss.includes(id),
        ),
        per_profile: improved,
      },
      null,
      2,
    ),
  );
}

main();
