# Next steps: match evaluation after V2 batch extraction

This document describes what to do **after** `ProfileExtractionV2` rows exist for the profiles you care about. **No implementation here** — planning only.

## Preconditions

- `UserProfile` rows populated from JSON (id, name, three text fields).
- `ProfileExtractionV2` populated per profile (JSON payload + denormalized signals).
- Decide whether matching still reads **V1** `ProfileJson` evaluation, **V2** DB only, or both during transition.

## Recommended sequence

1. **Define the evaluation surface for matching**
   - Map `ExtractionV2Result.base.{self,partner,relationship}.signals` into the same structure the compatibility layer expects today (or introduce a thin adapter so scoring code consumes a single `MatchInputSignals` type).
   - Decide how **interests** and **negatives** enter the score: additive layer, hard filters, or phase-2 only.

2. **Wire a “recompute match” path**
   - For each pair (or candidate set), load both users’ V2 extractions (or fail if missing).
   - Run existing compatibility / conflict logic with the adapted inputs.
   - Persist match rows (or JSON artifacts) with a **model version** tag (`v2_extraction`, prompt hash) for audits.

3. **Validation before rollout**
   - Golden pairs: expected rank / score band using V2 inputs.
   - Distribution: score deltas vs V1 on a fixed cohort (document expected drift).
   - Negatives: confirm hard tags (e.g. smoking) surface as dealbreakers where policy says they should.

4. **Operational**
   - Batch job: queue size, rate limits (V2 is 9 LLM calls per profile; matching may be CPU-only if signals are preloaded).
   - Idempotency: match id = sorted `(userA, userB, policyVersion, extractionTextHash)` or similar.

## Open decisions

- Whether **relationship** domain signals from V2 replace or supplement V1 relationship scoring.
- When to **re-enable relationship negatives** (currently empty by design in V2 v1).
- Whether to backfill **V1** `ProfileEvaluation` from V2 for UI compatibility or move UI to V2-only reads.

When you are ready to implement, start with the adapter + one end-to-end pair test, then expand to batch recompute.
