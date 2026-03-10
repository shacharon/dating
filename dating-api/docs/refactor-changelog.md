# Refactor changelog

## Extraction: remove dead mid-pipeline confidence updates (lowest-risk cleanup)

**Date:** 2025-03-09

- **Change:** Removed confidence updates that were always overwritten by `applyRecomputeConfidence`. Final confidence is and was always `coverage × signalCountFactor`; model confidence never affected the API output.
- **Locations:** (1) `extraction.service.ts` — removed the 0.8 penalty in `validateAndClean` when `corrected` is true. (2) `extraction-sparse-policy.ts` — when sparse guard caps signals/evidence, it no longer sets `confidence = min(data.confidence, 0.45)`; it passes through `data.confidence` (still overwritten by recompute at end).
- **Effect:** No change to public API or final output; fewer redundant writes and clearer single source of truth for confidence.
