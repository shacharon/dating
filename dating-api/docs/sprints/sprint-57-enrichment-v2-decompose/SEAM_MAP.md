# Enrichment-v2 seam map (Sprint 57 Story 01)

**Purpose:** Lock current seams in `src/evaluate/enrichment-v2.ts` so Story 02 can move frozen keyword logic into focused modules **without changing enrichment outputs**. Sprint 52 freeze still applies: no new regex / phrases / allowlist ids (structure only). Vocabulary growth requires RFC in [`KEYWORD_ENGINE_FREEZE.md`](../sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md). Ownership context: [`KEYWORD_INVENTORY.md`](../sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md).

---

## Public API (stay in `enrichment-v2.ts`)

| Symbol | Role |
|--------|------|
| `EnrichmentMappedSignals` | Result shape |
| `mapEnrichmentV2FromText` | Single-string entry |
| `buildEnrichmentSignalsV2` | Three-block entry (`joinBlocks` then map) |

Aliases `enrichment-v3.ts` / `enrichment-v4.ts` re-export these — do not relocate in Story 02.

---

## Functions / constants → target modules (Story 02)

| Current symbol | Kind | Target module (Story 02) |
|----------------|------|---------------------------|
| `joinBlocks` | helper | `enrichment-keyword-helpers.ts` |
| `isNegatedBefore` | helper | `enrichment-keyword-helpers.ts` |
| `firstMatching` | helper | `enrichment-keyword-helpers.ts` |
| `firstMatchingEarliest` | helper | `enrichment-keyword-helpers.ts` |
| `INTEREST_ALLOWLIST` | const | `enrichment-interest-keywords.ts` |
| `COOKING_JOB_HINT`, `cookingAllowedAt` | guard | `enrichment-interest-keywords.ts` |
| `BREWERY_YEAST_LAB_HINT`, `fermentationAllowedAt` | guard | `enrichment-interest-keywords.ts` |
| `sporePrintsAllowedAt` | guard | `enrichment-interest-keywords.ts` |
| `potteryAllowedAt` | guard | `enrichment-interest-keywords.ts` |
| `cartographyAllowedAt` | guard | `enrichment-interest-keywords.ts` |
| `MODEL_BUILDING_LEISURE_HINT`, `FURNITURE_MODEL_BUILDING_PHRASE`, `modelBuildingAllowedAt` | guard | `enrichment-interest-keywords.ts` |
| `boatingAllowedAt` | guard | `enrichment-interest-keywords.ts` |
| `bikeMeansCycling` | guard | `enrichment-interest-keywords.ts` |
| `INTEREST_PHRASE_RULES`, `TokenRule`, `interestsTop3V2` (+ inline `tokenRules` / run-hobby logic) | extractor | `enrichment-interest-keywords.ts` |
| `DAILY_RHYTHM_RULES` | rules | `enrichment-rhythm-keywords.ts` |
| `KIDS_RULES` | rules | `enrichment-rhythm-keywords.ts` |
| `RELATIONSHIP_PACE_RULES` | rules | `enrichment-rhythm-keywords.ts` |
| `AUTONOMY_RULES` | rules | `enrichment-conflict-keywords.ts` |
| `matchWithdrawsShutsDown`, `matchConflictStyleV2` | mapper | `enrichment-conflict-keywords.ts` |
| `COMMUNICATION_MODE_RULES` | rules | `enrichment-conflict-keywords.ts` |
| `mapEnrichmentV2FromText`, `buildEnrichmentSignalsV2`, `EnrichmentMappedSignals` | facade | `enrichment-v2.ts` (compose only) |

**Note:** Escalate / humor / repair / cooldown rule arrays that live **inside** `matchConflictStyleV2` move with that function (no separate symbol names required).

**Module summary:**

| Target file | Owns |
|-------------|------|
| `enrichment-keyword-helpers.ts` | Shared text/match helpers |
| `enrichment-interest-keywords.ts` | Allowlist + interest extractors + interest window guards |
| `enrichment-rhythm-keywords.ts` | `dailyRhythm` / `kidsTimeline` / `relationshipPace` |
| `enrichment-conflict-keywords.ts` | `conflictStyleDetail` / `communicationMode` / `autonomyTogethernessDepth` |
| `enrichment-v2.ts` | Thin composition + public exports |

---

## Out of scope / deferred

- Physical file split → [Story 02](./STORY_02_split_keyword_modules.md)
- Manifest wiring → [Story 03](./STORY_03_enrichment_manifest.md) (`enrichment-keyword-manifest.ts`, mirror `src/extraction/expansion-manifest.ts`)
- Vocabulary / RFC → Sprint 52 freeze docs

---

## Characterization pointer (golden parity for Story 02)

Keep these green when moving modules:

| Suite | Location |
|-------|----------|
| Phrase fixtures 1–10 | `src/evaluate/enrichment-v2.phrases.spec.ts` → `describe('mapEnrichmentV2FromText phrase fixtures')` |
| Sprint 57 seam locks | same file → `describe('sprint-57 characterization')` |
| Pace / communication / regression / `buildEnrichmentSignalsV2` | `src/evaluate/enrichment-v2.spec.ts` |

**Sprint 57 `describe('sprint-57 characterization')` cases:**

- hobby cooking positive control → `cooking`
- never go silent + talk it through → `process_together`
- line cook / kitchens / service season → no `cooking`
- pastry cook / sous chef → no `cooking`
- fermentation journals → `fermentation`
- bare fermentation near brewery/yeast labs → no `fermentation`
