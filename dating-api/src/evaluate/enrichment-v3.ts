/**
 * ENRICHMENT_V3 — extended phrase coverage for autonomyTogethernessDepth and interestsTop3 only.
 * Implementation lives in enrichment-v2.ts; this module is the stable import surface for V3.
 */

export {
  mapEnrichmentV2FromText as mapEnrichmentV3FromText,
  buildEnrichmentSignalsV2 as buildEnrichmentSignalsV3,
} from './enrichment-v2';
