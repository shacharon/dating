# Keyword engine inventory

**Sprint 52 Story 01 · Ownership + overlap map**

Inventory for freeze / consolidate work. **Not** a redesign — documents where keyword/regex/allowlist systems live and how they overlap today.

---

## Purpose

Three parallel keyword systems grow via additive regex and allowlists:

1. Enrichment closed-code mapping (`enrichment-v2`, live via v4 aliases)
2. Holy Grail free-text extractors (`*-text.extract.ts`)
3. LLM structured extraction (`src/extraction/`)

This document is the SoT for **who owns what** and **where domains collide**, so Story 02 (freeze or taxonomy) and Story 03 (no-new-regex policy) can act without archaeology.

---

## Engine ownership

| Engine | SoT path | Primary export(s) | Primary consumers | Writes / side effects? | Specs |
|--------|----------|-------------------|-------------------|------------------------|-------|
| `enrichment-v2` | `src/evaluate/enrichment-v2.ts` (aliases: `enrichment-v3.ts`, `enrichment-v4.ts` re-export the same functions) | `mapEnrichmentV2FromText`, `buildEnrichmentSignalsV2`, `EnrichmentMappedSignals` | `evaluate.service.ts` via `buildEnrichmentSignalsV4` → sanitize/persist enrichment blob | Yes — enrichment fields persisted on evaluate path (no scoring side effects inside the mapper itself) | `enrichment-v2.spec.ts`, `enrichment-v2.phrases.spec.ts` (+ v3/v4 phrase specs) |
| `hg-dealbreaker-text` | `src/holy-grail-matching/dealbreaker-signals-text.extract.ts` (+ taxonomy in `dealbreaker-taxonomy`) | `extractDealbreakerSignalsFromFreeText`, `extractSelfFactHintsFromFreeText`, `DealbreakerSignal` | `match-eligibility.service`, `match-ranking.service`, `match-detail.service`, `match-list-hard-block-pending`, `profile-write.helpers`, `match-quality-audit`, `holy-grail-structured-db-json`, `hard-block-reasons` / guardrails | Read-only extract; consumers apply to eligibility / hard-block / hints | `dealbreaker-signals-text.extract.spec.ts` (+ guardrail/eligibility specs) |
| `hg-lifestyle-text` | `src/holy-grail-matching/lifestyle-signals-text.extract.ts` | `LIFESTYLE_SIGNAL_TAGS` / `TAG_SET`, `extractLifestyleSignalsFromFreeText` | `holy-grail-structured-db-json` (canonical merge), `profile-to-canonical.mapper` (allowlist validation), barrel `holy-grail-matching/index.ts` | Read-only extract into HG mapping input | `lifestyle-signals-text.extract.spec.ts` |
| `hg-interest-text` | `src/holy-grail-matching/interest-tags-text.extract.ts` | `INTEREST_TAGS` / `INTEREST_TAG_SET`, `extractInterestTagsV1FromFreeText` | Same merge hub + mapper as lifestyle | Read-only extract into HG mapping input | `interest-tags-text.extract.spec.ts` |
| `hg-personality-text` | `src/holy-grail-matching/personality-traits-text.extract.ts` | `PERSONALITY_TRAIT_TAGS` / `TAG_SET`, `extractPersonalityTraitsFromFreeText` | Same merge hub + mapper as lifestyle | Read-only extract into HG mapping input | `personality-traits-text.extract.spec.ts` |
| `llm-extraction` | `src/extraction/` — esp. `extracted-signals.interface.ts` (`EXTRACTION_SIGNAL_KEYS`), `extracted-interests.interface.ts` (`INTEREST_CANONICAL_TAGS`), expansion prompt manifest | Structured LLM signals + interests (interests: **LLM-first, no regex fallback**) | Extraction pipeline → profile evaluation / compare / explainability; HG merge accepts optional `extractionV2` (`interests_self`, `interests`, `lifestyleTraits`) in `holy-grail-structured-db-json` | Yes — LLM run + persist evaluation payloads | `extraction.service.spec.ts`, `extracted-interests.spec.ts`, expansion rollout specs |

**Merge / consumer hub (not a separate engine):** `src/holy-grail-matching/retrieval/holy-grail-structured-db-json.ts` merges HG text extracts (personality / lifestyle / interest / dealbreaker) with optional `extractionV2` slices for the canonical matching path.

**Enrichment aliases:** do not treat v3/v4 as separate keyword engines — implementation lives only in `enrichment-v2.ts`.

---

## Domain overlap matrix

Cell values: **Owns** = SoT emitter for that domain · **Also emits** = parallel emitter · **Consumes only** · **—** = not in that engine.

| Domain | `enrichment-v2` | `hg-dealbreaker-text` | `hg-lifestyle-text` | `hg-interest-text` | `hg-personality-text` | `llm-extraction` |
|--------|-----------------|----------------------|---------------------|--------------------|----------------------|------------------|
| Interests / hobbies tags | **Also emits** (`INTEREST_ALLOWLIST` → `interestsTop3`) | — | — | **Owns** (HG `INTEREST_TAGS` deterministic) | — | **Owns** (`INTEREST_CANONICAL_TAGS` LLM-first) |
| Lifestyle tags | **Also emits** (enums that smell lifestyle: `dailyRhythm`, pace/autonomy-adjacent) | — | **Owns** (`LIFESTYLE_SIGNAL_TAGS`) | — | — | **Also emits** (`extractionV2.lifestyleTraits` when present on merge input) |
| Personality / trait tags | — | — | — | — | **Owns** (`PERSONALITY_TRAIT_TAGS`) | **Also emits** (numeric shadow/official signals that describe personality, not the HG tag set) |
| Dealbreaker / hard-block free-text | — | **Owns** | — | — | — | — (structured prefs/facts elsewhere; not this regex extract) |
| Enrichment closed enums (`dailyRhythm`, `kidsTimeline`, `conflictStyleDetail`, `relationshipPace`, `communicationMode`, `autonomyTogethernessDepth`, …) | **Owns** | — | — | — | — | — |
| Compatibility / shadow **numeric** signals (`EXTRACTION_SIGNAL_KEYS`) | — | — | — | — | — | **Owns** |

---

## Known collisions

- **Interests — three allowlists:** HG `INTEREST_TAGS` (e.g. `music`, `film`, `gaming`, `travel`) vs LLM `INTEREST_CANONICAL_TAGS` (19 tags: `hiking`, `movies`, `music`, …) vs enrichment `INTEREST_ALLOWLIST` / `interestsTop3` (overlapping words like `hiking`, `music`, `gaming`, `yoga`, `travel` but **different id sets and emitters**).
- **Lifestyle — dual paths:** HG `LIFESTYLE_SIGNAL_TAGS` (e.g. `travel`, `gaming`, `reading`) vs optional LLM `extractionV2.lifestyleTraits` on the HG merge hub; enrichment also encodes lifestyle-ish closed enums (`dailyRhythm`, autonomy/pace) that are **not** the HG tag vocabulary.
- **Conflict — dual representations:** enrichment `conflictStyleDetail` (closed string codes from regex) vs LLM official numeric `conflictStyle` in `EXTRACTION_SIGNAL_KEYS` — same product idea, different engines and types.
- **No single SoT yet:** do not assume one allowlist wins until Story 02 (freeze vs taxonomy generation).

---

## Out of scope / next stories

| Story | Owns |
|-------|------|
| [02 — Freeze or taxonomy](./STORY_02_freeze_or_taxonomy.md) | Freeze dumps or generate classifiers from one taxonomy; parity tests |
| [03 — No-new-regex policy](./STORY_03_no_new_regex_policy.md) | Agent/PR policy: where new signals go |

This inventory does **not** resolve collisions, delete dead paths, or change extract behavior.

---

## How to update this doc

1. Add or change keywords only in the owning SoT module for that engine.
2. Update the **ownership** row and **overlap matrix** cell(s) here in the same PR.
3. Follow Story 03 no-new-regex policy once it lands (until then: do not add ad-hoc regex without inventory update + Story 02 direction).
