# Agent 1 — Dev Handoff: Expansion-07 Story 1 (Schema)

**Story:** Schema Infrastructure  
**Sprint:** Expansion-07 Profile Gap Signals  
**Date:** 2026-08-07  
**Status:** Complete — ready for Agent 2 (Code Review)

---

## Summary

Added five **net-new** shadow-only Profile Gap signal keys with metadata (weights / domains / chip labels). **No** LLM prompt text, **no** `DOMAIN_ALLOWED` expansion, **no** scoring promote. Official scored set remains **15**.

---

## Files Changed

| File | Change |
|------|--------|
| `src/extraction/extracted-signals.interface.ts` | Appended 5 keys to `SHADOW_SIGNAL_KEYS`; `MAX_EVIDENCE_ITEMS` **34 → 39**; Exp-07 distinction JSDoc |
| `src/extraction/expansion-07-signal-definitions.ts` | **Created** — metadata only (`EXPANSION_07_SIGNAL_META`, weight getters, chip labels). Prompt block deferred to Story 2 |
| `src/extraction/extracted-signals.spec.ts` | Shadow **20**, total **35**, Exp-07 no-scoring + meta asserts |
| `src/extraction/extraction.service.spec.ts` | Coverage floor comment/assert for **35** keys (5/35 ≈ 14%) |

---

## Counts After Story 1

| Metric | Value |
|--------|-------|
| Official scored (`COMPATIBILITY_SIGNAL_KEYS`) | **15** (unchanged) |
| Shadow (`SHADOW_SIGNAL_KEYS`) | **20** (was 15) |
| Total extraction (`EXTRACTION_SIGNAL_KEYS`) | **35** |
| `MAX_EVIDENCE_ITEMS` | **39** (= 15 + 20 + 4) |
| Self `DOMAIN_ALLOWED` | still **22** (Story 2 expands) |

---

## New Shadow Keys (order)

1. `casualIntimacyIntent`
2. `supportExchangeOrientation`
3. `supportProviderOrientation`
4. `supportRecipientOrientation`
5. `religiousObservance`

---

## Distinction From Existing Signals (locked)

| New key | Must not collapse into |
|---------|------------------------|
| `casualIntimacyIntent` | `relationshipIntent` (timeline/seriousness ≠ intimacy tempo) |
| `supportExchangeOrientation` | `emotionalSupportStyle` (give/receive preference ≠ how support is shown) |
| `supportProviderOrientation` | same |
| `supportRecipientOrientation` | same |
| `religiousObservance` | `traditionOpenness` (practice intensity ≠ openness to difference) |

---

## Verification

```text
npx tsc --noEmit -p tsconfig.json
→ exit 0

npx jest src/extraction/extracted-signals.spec.ts --runInBand
→ 35/35 passed

npx jest src/extraction/extraction.service.spec.ts --runInBand -t "coverage between short"
→ pass (floor >= 14 for 35 keys)
```

---

## Explicit Non-Goals (this story)

- No `EXPANSION_07_SIGNAL_DEFINITIONS` prompt block / SELF_EXTRACTOR_PROMPT
- No `DOMAIN_ALLOWED` / `isValidSelfSignalKey` changes
- No tension rules, overlays, i18n, fixtures, validators
- No `SignalKey` / promote

---

## Next Agent

**Agent 2 (Code Review)** — verify allowlist-only, metadata file has no LLM prose, counts, and no scoring leak.

Then: `--agent 3 expansion 07 story 1`
