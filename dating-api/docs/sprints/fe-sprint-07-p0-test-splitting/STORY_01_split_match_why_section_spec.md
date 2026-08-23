# Story 01 — Split match-why-section.spec.tsx

**Sprint:** FE-07  
**Effort:** 1 day  
**Risk:** ⚡ LOW  
**Status:** **Done**  

**Branch:** `feature/fe-sprint-07-story-1` (from `main`)  

**Handoffs:** [preflight](./handoffs/STORY_01_split_match_why_section_spec/agent--1-preflight.md) · [architect](./handoffs/STORY_01_split_match_why_section_spec/agent-0-architect.md) · [dev](./handoffs/STORY_01_split_match_why_section_spec/agent-1-dev.md) · [CR](./handoffs/STORY_01_split_match_why_section_spec/agent-2-review.md) · [PM](./handoffs/STORY_01_split_match_why_section_spec/agent-3-pm.md)

---

## Objective

Split the Expansion chip UI tests so a failure in Expansion-14 doesn't require scrolling through 1000 lines.

---

## Tasks

1. [x] Extract `baseMatch()` to `match-why-section.spec-support.tsx` (no `renderMatchWhySection` — keep inline `render`).
2. [x] Group describes into tranche files (locked layout in architect handoff — **no** `core.spec`).
3. [x] Add policy spec — fail if monolith returns or any tranche >400 non-empty LOC.
4. [x] Run `npm test -- match-why-section`.

---

## Success

- [x] Monolith deleted
- [x] Test count unchanged (59 functional)
- [x] Max tranche ≤400 non-empty LOC

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
