/**
 * Enrichment keyword module manifest — structural SoT for composing closed-code mappers.
 *
 * Sprint 52 keyword engine: enrichment-v2 (structural registry — Sprint 57 Story 03)
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN — docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * Structure registration only; no new regex/phrases/allowlist ids without RFC in that doc.
 *
 * Adding a domain module: new file under src/evaluate/ + one MODULE_MANIFEST row + FIELD_MAPPERS entries.
 * Do not edit enrichment-v2.ts facade splices for new domain modules.
 */

import { joinBlocks } from './enrichment-keyword-helpers';
import { interestsTop3V2 } from './enrichment-interest-keywords';
import {
  mapDailyRhythm,
  mapKidsTimeline,
  mapRelationshipPace,
} from './enrichment-rhythm-keywords';
import {
  mapAutonomyTogethernessDepth,
  mapCommunicationMode,
  mapConflictStyleDetail,
} from './enrichment-conflict-keywords';

export type EnrichmentKeywordModuleId =
  | 'enrichment-keyword-helpers'
  | 'enrichment-interest-keywords'
  | 'enrichment-rhythm-keywords'
  | 'enrichment-conflict-keywords';

/** Documentation / OCP registry — append a row when a new domain module file is introduced. */
export const ENRICHMENT_KEYWORD_MODULE_MANIFEST: readonly {
  id: EnrichmentKeywordModuleId;
  file: string;
}[] = [
  { id: 'enrichment-keyword-helpers', file: 'enrichment-keyword-helpers.ts' },
  { id: 'enrichment-interest-keywords', file: 'enrichment-interest-keywords.ts' },
  { id: 'enrichment-rhythm-keywords', file: 'enrichment-rhythm-keywords.ts' },
  { id: 'enrichment-conflict-keywords', file: 'enrichment-conflict-keywords.ts' },
];

/** Runtime composition SoT — facade must build EnrichmentMappedSignals only via these mappers. */
export const ENRICHMENT_FIELD_MAPPERS = {
  dailyRhythm: mapDailyRhythm,
  autonomyTogethernessDepth: mapAutonomyTogethernessDepth,
  kidsTimeline: mapKidsTimeline,
  conflictStyleDetail: mapConflictStyleDetail,
  relationshipPace: mapRelationshipPace,
  communicationMode: mapCommunicationMode,
  interestsTop3: interestsTop3V2,
} as const;

export function mapEnrichmentMappedSignals(text: string): {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  relationshipPace: string | null;
  communicationMode: string | null;
  interestsTop3: string[];
} {
  return {
    dailyRhythm: ENRICHMENT_FIELD_MAPPERS.dailyRhythm(text),
    autonomyTogethernessDepth:
      ENRICHMENT_FIELD_MAPPERS.autonomyTogethernessDepth(text),
    kidsTimeline: ENRICHMENT_FIELD_MAPPERS.kidsTimeline(text),
    conflictStyleDetail: ENRICHMENT_FIELD_MAPPERS.conflictStyleDetail(text),
    relationshipPace: ENRICHMENT_FIELD_MAPPERS.relationshipPace(text),
    communicationMode: ENRICHMENT_FIELD_MAPPERS.communicationMode(text),
    interestsTop3: ENRICHMENT_FIELD_MAPPERS.interestsTop3(text),
  };
}

export { joinBlocks };
