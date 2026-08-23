# FE Sprint 07 — P0 Test Splitting (match-why-section)

**Status:** **Complete** (Story 01 Done)  
**Priority:** 🔴 **P0** — UI test maintainability  
**Depends on:** None (can run parallel to Sprint 69)  
**Repo:** `dating-ui`  
**Companion:** Backend counterpart [Sprint 69](../sprint-69-p0-test-splitting/README.md)

---

## Goal

Split `match-why-section.spec.tsx` (1059 LOC) into expansion tranche files — same pattern as backend expansion shadow splits.

---

## Current structure

~~13 top-level describes in monolith~~ → **4 tranche specs** (Exp 01–04, 05–07, 10–13, 14–15) + spec-support + policy.

---

## Target layout (locked — Agent 0)

```
dating-ui/src/app/dating/me-matches/
  match-why-section.spec-support.tsx              # baseMatch() only
  match-why-section.expansion-01-04.spec.tsx
  match-why-section.expansion-05-09.spec.tsx      # content: Exp 05–07
  match-why-section.expansion-10-13.spec.tsx
  match-why-section.expansion-14-15.spec.tsx
  match-why-section-spec-size.policy.spec.ts
```

Monolith **deleted**. **No** `core.spec`. No file >400 non-empty LOC.

---

## Story

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Split match-why-section.spec](./STORY_01_split_match_why_section_spec.md) | 1 day | ⚡ LOW | **Done** |

---

## Agent commands

```text
--agent -1 fe-sprint 07 story 1
--agent 0 fe-sprint 07 story 1
--agent 1 fe-sprint 07 story 1
--agent 2 fe-sprint 07 story 1
--agent 3 fe-sprint 07 story 1
```

---

## Success Criteria

- [x] Monolith deleted
- [x] All expansion chip tests preserved (59 functional)
- [x] No split file >400 non-empty LOC
- [x] `npm test` green in `dating-ui` (882/882)
