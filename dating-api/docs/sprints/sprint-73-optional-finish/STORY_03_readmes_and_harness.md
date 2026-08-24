# Story 03 — Module READMEs + Eligibility Harness Thin

**Sprint:** 73  
**Effort:** 0.5–1 day  
**Risk:** ⚡ LOW  
**Status:** Optional

---

## Objective

1. Add short READMEs for modules still missing them.
2. Thin `me-matches-eligibility.spec-support.ts` if still ≫600 LOC (fixtures → builders).

---

## READMEs (1 screen each)

| Module | Must include |
|--------|--------------|
| `extraction/` | Pipeline entry, Expansion add path |
| `holy-grail-matching/` | Canonical mapper, dealbreaker freeze note |
| `evaluate/` | Orchestrator + enrichment modules |

Skip if README already exists (`matches/`, `me-profile/` already have them).

---

## Harness

If `me-matches-eligibility.spec-support.ts` still >1000 LOC:

```
me-profile/matches/support/
  me-matches-eligibility.fixtures.ts
  me-matches-eligibility.builders.ts
  me-matches-eligibility.spec-support.ts   # ≤600 LOC re-exports
```

If already thinned in Sprint 69 — **skip** and mark Done in handoff.

---

## Success

- [ ] Three READMEs present (or N/A documented)
- [ ] Harness ≤600 LOC or accept note
- [ ] Tests green

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
