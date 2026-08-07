# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-08-education-integrity-lifestyle  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Wired four Expansion-08 shadow signals into the **production extraction pipeline** (self + partner).
- Extended Story 1 metadata file with semantic prompt blocks (EN/HE examples as meaning aids only).
- Synced `DOMAIN_ALLOWED` **27 → 31** (self) / **13 → 17** (partner).
- **No** scoring / tension / chips / regex / category storage schema / evaluate-layer changes.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-08-signal-definitions.ts` | Added `EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK` (kept Story 1 meta) |
| `dating-api/src/extraction/extraction.service.ts` | Import blocks; self/partner ALLOWED KEYS + SIGNAL RULES + Exp-08 blocks; upgraded adjacent rules (directness, curiosity, pace, ambition, physicalPriority) |
| `dating-api/src/extraction/extraction-strict-validation.ts` | `DOMAIN_ALLOWED.self` **27 → 31**; `.partner` **13 → 17** |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Domain length asserts; Exp-08 allowlist membership |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-08 shadow signals')` — high/low/null + OOR strip + partner smokes |

---

## Counts After Story 2

| Metric | Value |
|--------|-------|
| Official scored | **15** (unchanged) |
| Shadow | **24** |
| Total extraction | **39** |
| `MAX_EVIDENCE_ITEMS` | **43** |
| Self `DOMAIN_ALLOWED` | **31** |
| Partner `DOMAIN_ALLOWED` | **17** |
| Relationship `DOMAIN_ALLOWED` | **7** (unchanged) |

---

## Tests / verification

- [x] `npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-08"` → **14/14** passed
- [x] `npx jest src/extraction/extracted-signals.spec.ts --runInBand` → **41/41** passed
- [x] `npm run typecheck` → exit 0
- [x] `prisma migrate deploy`: N/A
- [x] Browser Network smoke: N/A

---

## Explicit Non-Goals (this story)

- No evaluate-layer prompts / text-inference regex
- No tension / chips / promote / `COMPATIBILITY_SIGNAL_KEYS`
- No `RELATIONSHIP_EXTRACTOR_PROMPT` changes
- No structured physical-type category storage
- No live Hebrew fixtures (Story 5)
- No edits to Exp-01–07 definition files

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped

---

## Open questions / blockers

- None

---

## Next agent

```text
--agent 2 expansion 08 story 2
```

**Notes:** CR checklist in architect handoff. Keep shadow / no scoring. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-08 education/integrity/lifestyle signals

Story 2 — self+partner shadow extraction; no scoring impact.
```
