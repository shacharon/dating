/**
 * ENRICHMENT_V4 — targeted phrase patches (autonomy + interests) on top of V3.
 * Implementation lives in enrichment-v2.ts; stable import surface for V4.
 */

export {
  mapEnrichmentV2FromText as mapEnrichmentV4FromText,
  buildEnrichmentSignalsV2 as buildEnrichmentSignalsV4,
} from './enrichment-v2';
