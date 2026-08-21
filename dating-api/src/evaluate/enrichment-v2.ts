/**
 * ENRICHMENT_V2 core + V3/V4 extensions (autonomyTogethernessDepth + interestsTop3 only).
 * Deterministic closed-code mapping only; emits snake_case enum strings; no scoring side effects.
 *
 * Sprint 52 keyword engine: enrichment-v2 (manifest-driven facade — Sprint 57 Story 03)
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN — docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 *
 * This module: thin public facade — composition via enrichment-keyword-manifest.ts.
 */

import {
  joinBlocks,
  mapEnrichmentMappedSignals,
} from './enrichment-keyword-manifest';

/** Mapper output before `sanitizeEnrichmentSignalsV1` (labels are intended to be canonical snake_case). */
export interface EnrichmentMappedSignals {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  relationshipPace: string | null;
  communicationMode: string | null;
  interestsTop3: string[];
}

export function mapEnrichmentV2FromText(text: string): EnrichmentMappedSignals {
  return mapEnrichmentMappedSignals(text);
}

export function buildEnrichmentSignalsV2(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): EnrichmentMappedSignals {
  return mapEnrichmentV2FromText(
    joinBlocks(aboutMe, aboutPartner, aboutRelationship),
  );
}
