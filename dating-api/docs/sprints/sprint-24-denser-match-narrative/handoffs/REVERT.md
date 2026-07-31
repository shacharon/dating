# Handoff: Sprint 24 — Reverted

**Date:** 2026-07-31  
**Status:** complete (revert)

---

## Summary

- Full revert of denser narrative (`v5`) back to Sprint 23 **`v4`**.
- Reason: shorter copy lost Phase 3 profile-excerpt music.

## Code restored

| Area | Restored to |
|------|-------------|
| `MATCH_NARRATIVE_PROMPT_VERSION` | `v4` |
| System / user prompt | 5–12 sentences; no denser shape line |
| Validator | min 3 / max 16; no word ceiling |
| Fallback | `traits.slice(0, 5)` |

## Operator

Restart API. Open match detail → should use `v4` (miss if only `v5` was cached, or hit prior `v4` rows).
