# Story 03 — Module READMEs + Eligibility Harness Thin

**Sprint:** 73  
**Effort:** 0.5–1 day  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_03_readmes_and_harness/agent--1-preflight.md) · [architect](./handoffs/STORY_03_readmes_and_harness/agent-0-architect.md) · [dev](./handoffs/STORY_03_readmes_and_harness/agent-1-dev.md) · [CR](./handoffs/STORY_03_readmes_and_harness/agent-2-cr.md) · [PM](./handoffs/STORY_03_readmes_and_harness/agent-3-pm.md)

---

## Objective

1. Add short READMEs for modules still missing them.
2. Thin `me-matches-eligibility.spec-support.ts` if still ≫600 LOC (fixtures → builders).

---

## READMEs (1 screen each)

| Module | Must include | Status |
|--------|--------------|--------|
| `extraction/` | Pipeline entry, Expansion add path | **N/A** (Story 01) |
| `holy-grail-matching/` | Canonical mapper, dealbreaker freeze note | ✅ |
| `evaluate/` | Orchestrator + enrichment modules | ✅ |

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

**Shipped:** N/A — already thinned in Sprint 69 (`spec-support.ts` barrel ≪600 LOC; fixtures/builders/harness siblings present).

---

## Success

- [x] Three READMEs present (or N/A documented) — extraction N/A · HG + evaluate ✅
- [x] Harness ≤600 LOC or accept note — **N/A / accept** (Sprint 69)
- [x] Tests green (Agent 2: **48** suites / **449** scoped unit)

**Pipeline:** `-1 → 0 → 1 → 2 → 3`

---

## Shipped

`feature/sprint-73-story-3` @ `8c41d52`

- `c422b9c` — docs: add holy-grail-matching and evaluate READMEs
- `0103624` — test: add README wiring guards for HG and evaluate modules
- `8c41d52` — chore: close sprint 73 story 3

**Shipped on main:** `f4cdb6d`  
**Feature tip ahead of main:** 0

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** HG + evaluate onboarding docs without touching algorithms or harness layout.

---

## SOLID / KISS

- **SRP:** docs-only; freeze pointers stay in Sprint 52 policy.
- **KISS:** Skip extraction README rewrite and harness re-split when already done.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
