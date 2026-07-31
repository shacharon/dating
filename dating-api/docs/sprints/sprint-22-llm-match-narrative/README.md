# Sprint 22: Hybrid LLM match narrative (Phase 2)

**Epic:** Match explainability today is deterministic templates glued to jargon chip labels ("Some alignment around ambition alignment and emotional depth."). Readable for engineers, not for daters. This sprint adds a **hybrid LLM narrative**: the engine still owns the facts (chips, traits, score band, tension, shared interests); an LLM only turns those facts into a human 5–12 sentence "why you match" paragraph. Scoring is untouched. Raw profile free-text is **forbidden** in this call (Phase 3 later).
**Duration:** ~1–1.5 weeks (3 stories)
**Goal:** Match **detail** shows a grounded, human-readable narrative (5–12 sentences, scaled by alignment richness). List card stays short. Narrative is cached per evaluation pair (lazy on first open). LLM failure falls back to today's template takeaway. No score/ranker changes.
**Status:** Done  
**Depends on:** Sprint 21 explainability (`positiveChips`, `sharedInterestNote`, `matchExplanationTraits`, `recommendation.primaryTakeaway`); existing `LlmModule` / OpenAI client

---

## Why this sprint

The secret sauce of a dating product is not the score number — it's the *feeling* of "why this person." Templates cannot deliver that. Full freeform LLM over raw `aboutMe` text (Phase 3) is richer but riskier (leakage, cost, inconsistency). Phase 2 is the safe middle:

1. **Deterministic facts in** — chips, `matchExplanationTraits` (label + evidence + strength), score band, tension (if friction ≥ 3), shared interests, suggested next-action tone.
2. **LLM phrases only** — no inventing signals, no quoting raw story text, no changing scores.
3. **Cache + fallback** — one LLM call per evaluation-pair version; template takeaway if the call fails.

This reuses the existing LLM infra (`src/llm/`) under a new purpose (e.g. `match_narrative`), without touching HG eligibility or blend weights.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Approach | **Hybrid Phase 2** — facts from engine, prose from LLM. Full freeform over raw profile text = Phase 3 follow-up. |
| LLM input (allowed) | `positiveChips`, `matchExplanationTraits` (group/label/evidence/strength), `finalScore` band, top tension (if friction ≥ 3), `sharedInterestTags` / `sharedInterestNote`, `caution` / `suggestedNextAction` tone hints. |
| LLM input (**forbidden**) | Raw `aboutMe` / `aboutPartner` / `aboutRelationship`. No free-text quotes. |
| LLM output | New long-form field `matchNarrative` (5–12 sentences). Keep existing short `primaryTakeaway` / `reasonShort` for list cards. |
| Length rule | Scale with fact richness: ~1 opener (score band) + ~1 per chip/trait (cap ~5) + optional shared-interests sentence + optional tension sentence + 1 closer → naturally **5–12**. Never pad with fluff. |
| Scoring / ranking | **Untouched.** No blend weight, signal, or HG eligibility changes. |
| When LLM runs | **Lazy, on-demand** — first time match detail needs a narrative for a given evaluation pair. |
| Cache key | `(viewerProfileId, candidateProfileId, viewerEvaluationId, candidateEvaluationId)` (+ optional prompt-version constant). |
| Profile update behavior | Editing profile alone does nothing. After **re-analysis** (new `UserProfileEvaluation`), cache key changes → next detail open regenerates. Same pattern as `viewerProfileAnalysisStale`. |
| Eager regen after analysis | **Out of scope** (would burn tokens for unread matches). |
| TTL | **None for v1** — evaluation IDs are the invalidation. Prompt/version bump is a deliberate cache-key change if we ship a new prompt. |
| Fallback | On LLM timeout/error/empty/ungrounded output → use today's `buildPrimaryTakeaway` / `reasonShort` (or a multi-sentence template built from traits). Detail must never blank. |
| Surface | Match **detail** only for long narrative. Match **list** keeps short takeaway/chips. |
| i18n | English-first narrative for v1 (LLM prompt in EN). Other locales can fall back to template or skip narrative until a later story. |
| Privacy / logging | Do not log full narrative or fact-pack PII at info level; purpose-tag LLM calls; no raw story text in prompts (already forbidden). |

---

## Story checklist

| # | Story | Priority | Depends on | Status |
|---|-------|----------|------------|--------|
| 1 | [Fact pack + constrained LLM narrative generator + fallback](./STORY_01_llm_narrative_generator.md) | **P0** | — | Done |
| 2 | [Wire into match detail path + evaluation-keyed cache](./STORY_02_wire_and_cache.md) | **P0** | Story 1 | Done |
| 3 | [UI: render matchNarrative on match detail](./STORY_03_ui_match_narrative.md) | **P0** | Story 2 | Done |
| 4 | [Narrative voice — kill chip jargon and fluff](./STORY_04_narrative_voice_anti_jargon.md) | **P0** | Stories 1–3 | Done |

**Execution order (locked):**

1. Story 1 — pure module: fact-pack builder, prompt contract, LLM call, validation, fallback (unit-testable without HTTP).
2. Story 2 — call from match detail / recommendation path; persist cache; invalidate via evaluation IDs.
3. Story 3 — dating-ui types + match detail rendering.
4. You eyeball a real match detail (local) with LLM key set, then with LLM forced-fail to confirm fallback.
5. Story 4 — voice fix: stop feeding chip labels to the LLM; ban fluff; tighten grounding; bump `promptVersion` (skip Agent 4).

---

## Sprint-level definition of done

- [x] Match detail returns a grounded `matchNarrative` (5–12 sentences) built from structured facts only. *(API Story 2 + UI Story 3)*
- [x] Raw profile free-text is never included in the narrative LLM prompt.
- [x] Opening the same match twice with unchanged evaluations does **not** re-call the LLM (cache hit).
- [x] Re-analysis of either side → new narrative on next open.
- [x] LLM failure → template fallback; detail still useful.
- [x] Match list UX unchanged (short takeaway / chips only).
- [x] Scores / HG eligibility / blend weights unchanged.
- [x] Unit + integration coverage for generator, cache key, fallback, UI render.
- [x] Narrative voice is human (no chip-label echo / brochure fluff) — **Story 4** (`promptVersion` v2; lean facts; bans + evidence grounding; fallback scrub).
- [x] Phase 3 (raw-text freeform) captured as a follow-up, not started → **moved to Sprint 23 Story 3**.

**Sprint status:** Done — Stories 1–4 complete. Optional: local smoke of live LLM voice after API restart (v2 cache miss → regenerate). Phase 3: see `../sprint-23-human-match-copy/STORY_03_profile_full_why_phase3.md`.
