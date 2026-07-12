# Sprint 21: Promote life-fit signals into the live compatibility engine

**Epic:** The live match ranker (`compareWithStatus`, the "14-signal" engine) scores personality and values but is blind to two things that strongly predict real relationship fit: how a couple handles conflict, and whether they share interests. Both already exist in the system but are switched off — `conflictStyle` is an extracted-but-unscored "shadow" signal, and interests are extracted for tags but never scored. This sprint promotes both into the live blended score as first-class inputs, with full recalibration so existing match scores stay sane.
**Duration:** ~1–2 weeks (5 stories)
**Goal:** `conflictStyle` becomes an active 15th compatibility signal, and a new bounded `interestAlignment` term joins the score blend. Match scores are recalibrated so the change is intentional and measured, not accidental drift. UI surfaces shared-interest explainability. The redundant HG five-signal *ranker* is deleted after verification. The Holy Grail *eligibility* gate stays untouched.
**Status:** In progress (Stories 1–2 done)
**Depends on:** existing extraction pipeline (conflictStyle already extracted), `compareWithStatus` live path

---

## Why this sprint

The decision (locked with product) is: **the 14-signal engine stays the ranker; we do not resurrect the parallel Holy Grail 5-signal ranker.** Instead we take the genuinely-missing signals from the Holy Grail idea and fold them into the live engine as equals.

Two facts make this cheap and safe:

1. **`conflictStyle` is already extracted.** It's in the `self` and `partner` LLM prompts (`src/extraction/extraction.service.ts`) and listed as a shadow key in `src/extraction/extracted-signals.interface.ts`. Today it is silently dropped from scoring because it's not in `COMPATIBILITY_SIGNAL_KEYS`. Promoting it is wiring, not new extraction.
2. **Interests are already extracted** (`src/evaluate/enrichment-signals.ts`) but never contribute to the score. They're a list, not a 1–10 scale, so they need their own overlap term rather than a signal slot.

This is the same "promote a shadow signal into live scoring" move the codebase already understands, and it aligns with the Sprint 17 note that the live order comes from `compareWithStatus`, not the five-signal ranker.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Engine | Keep `compareWithStatus` (14-signal) as the ranker. Do **not** revive the HG five-signal ranker. |
| `conflictStyle` | Promote from `SHADOW_SIGNAL_KEYS` to `OFFICIAL_EXTRACTION_SIGNAL_KEYS`; add to `COMPATIBILITY_SIGNAL_KEYS`, `COMPATIBILITY_WEIGHTS`, and a tier. First-class numeric signal (1–10), same treatment as the other 14. |
| `conflictStyle` tier/weight | Tier 2 (personality); starting weight `1.3` (above baseline 1.0, below the 1.5 core-values). Final weight set by calibration in Story 3. |
| Interests | Add a new `interestAlignment` (0–100) blend component computed from interest-tag overlap (Jaccard), **not** a 15th numeric signal. |
| Blend rebalance | Extend `COMPATIBILITY_BLEND_WEIGHTS` to include `interestAlignment` and rebalance so weights still sum to 1. Starting point: `aToB 0.28, bToA 0.28, relationshipFit 0.24, valuesAlignment 0.12, interestAlignment 0.08`. Final split set by calibration. |
| Coverage | Coverage denominator moves 14 → 15 for the numeric signals. Existing profiles (no `conflictStyle` value yet) will read slightly lower coverage until backfill — accepted and measured. |
| HG eligibility gate | **Untouched.** kids/smoking/gender/age hard filters keep working exactly as today. |
| Backfill | **Out of scope / follow-up.** Existing profiles get `conflictStyle` only when re-analyzed. Sprint ships code + calibration; backfill is a separate, cost-bearing run. |
| UI sharedInterestNote | **In scope (Story 4).** Wire `explainability.sharedInterestNote` into dating-ui match surfaces. |
| HG five-signal ranker deletion | **In scope (Story 5).** Remove the redundant ranker *after* Stories 1–3 are verified. Do **not** touch HG eligibility. |

---

## Story checklist

| # | Story | Priority | Depends on | Status |
|---|-------|----------|------------|--------|
| 1 | [Promote conflictStyle to an active compatibility signal](./STORY_01_promote_conflictstyle.md) | **P0** | — | Done |
| 2 | [Add interestAlignment blend component](./STORY_02_interest_alignment.md) | **P0** | — | Done |
| 3 | [Recalibrate scores + update golden/calibration tests](./STORY_03_recalibrate.md) | **P0** | Stories 1, 2 | Done |
| 4 | [UI display of sharedInterestNote](./STORY_04_ui_shared_interest_note.md) | **P0** | Story 2 | Planned |
| 5 | [Delete HG five-signal ranker](./STORY_05_delete_hg_five_signal_ranker.md) | **P1** | Stories 1–3 verified | Planned |

**Execution order (locked):**

1. Push Stories 1 + 2 (code only).
2. Local Sprint 21 fixture seeds + field check (API/DB/UI network).
3. Story 3 — recalibrate + golden deltas.
4. Enlarge unit + e2e against final weights.
5. Story 4 — UI `sharedInterestNote` (can start after Story 2; finish after seeds so you can eyeball it).
6. Story 5 — delete HG five-signal ranker (only after live path + Story 3 look good).
7. You final check.

---

## Sprint-level definition of done

- [x] `conflictStyle` is an active numeric compatibility signal (extraction → scoring → explainability), not a shadow key.
- [x] `interestAlignment` contributes a bounded, named term to the blended score; blend weights sum to 1.
- [x] HG eligibility gate behavior is byte-for-byte unchanged (verified by its integration suite).
- [x] Match scores recalibrated; golden-pair expectations updated deliberately with documented before/after deltas.
- [ ] `sharedInterestNote` rendered in dating-ui when present.
- [ ] HG five-signal *ranker* removed; eligibility path unchanged.
- [ ] Full `dating-api` (+ relevant UI) test suite green.
- [x] Backfill re-analysis captured as a separate follow-up ticket (still out of sprint).
