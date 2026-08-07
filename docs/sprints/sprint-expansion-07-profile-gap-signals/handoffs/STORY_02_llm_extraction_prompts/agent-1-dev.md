# Agent 1 — Dev Handoff: Expansion-07 Story 2 (LLM Extraction Prompts)

**Story:** LLM Extraction Prompts  
**Sprint:** Expansion-07 Profile Gap Signals  
**Date:** 2026-08-07  
**Status:** Complete — ready for Agent 2 (Code Review)

---

## Summary

Wired five Profile Gap shadow signals into the **production extraction pipeline** (self + partner). Extended Story 1 metadata file with semantic prompt blocks. Synced `DOMAIN_ALLOWED`. **No** scoring / tension / chips / regex.

---

## Files Changed

| File | Change |
|------|--------|
| `src/extraction/expansion-07-signal-definitions.ts` | Added `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK` (kept Story 1 meta) |
| `src/extraction/extraction.service.ts` | Import blocks; self ALLOWED KEYS + SIGNAL RULES + Exp-07 block; partner ALLOWED KEYS + SIGNAL RULES + block; upgraded spirituality / physicalAffectionStyle / traditionalism / physicalPriority; FAMILY LANGUAGE RULE soft-update |
| `src/extraction/extraction-strict-validation.ts` | `DOMAIN_ALLOWED.self` **22 → 27**; `.partner` **8 → 13** |
| `src/extraction/extracted-signals.spec.ts` | Domain length asserts; Exp-07 allowlist membership |
| `src/extraction/extraction.service.spec.ts` | `describe('Expansion-07 shadow signals')` — high/low/null + Profile-C support set + OOR strip + partner smoke |

---

## Counts After Story 2

| Metric | Value |
|--------|-------|
| Official scored | **15** (unchanged) |
| Shadow | **20** |
| Total extraction | **35** |
| `MAX_EVIDENCE_ITEMS` | **39** |
| Self `DOMAIN_ALLOWED` | **27** |
| Partner `DOMAIN_ALLOWED` | **13** |
| Relationship `DOMAIN_ALLOWED` | **7** (unchanged) |

---

## Verification

```text
npx jest src/extraction/extraction.service.spec.ts src/extraction/extracted-signals.spec.ts --runInBand -t "Expansion-07"
→ pass

npx tsc --noEmit -p tsconfig.json
→ exit 0
```

---

## Explicit Non-Goals (this story)

- No evaluate-layer prompts / text-inference regex
- No tension / chips / promote / `COMPATIBILITY_SIGNAL_KEYS`
- No `RELATIONSHIP_EXTRACTOR_PROMPT` changes
- No live Hebrew fixtures (Story 5)
- No edits to Exp-01–06 definition files

---

## Next Agent

**Agent 2 (Code Review)** — verify LLM-first (no keyword scoring), self+partner wiring, DOMAIN_ALLOWED counts, shadow lock.

Then: `--agent 3 expansion 07 story 2`
