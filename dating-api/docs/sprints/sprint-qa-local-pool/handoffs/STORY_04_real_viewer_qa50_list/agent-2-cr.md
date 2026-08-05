# Handoff: Agent 2 — CR — Sprint QA pool Story 4

**Agent:** 2 CR  
**Story:** [STORY_04_real_viewer_qa50_list.md](../../STORY_04_real_viewer_qa50_list.md)  
**Sprint:** sprint-qa-local-pool  
**Date:** 2026-08-05  
**Status:** complete  
**Verdict:** **PASS**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)

---

## Summary

Story 4 matches Architect locks: synthetic photos (Approach A), separate `qa50:ranks-real`, scoped delete of `qa50_*` candidates only, fixture viewers refused, non-qa50 ranks preserved, analysis out, fake login parked. No product UI/`src` changes. CR **PASS** with no required fixes.

---

## Architect lock checklist

| Item | Result |
|------|--------|
| `--email` / env / `--userId`; no auto-pick | **Pass** |
| Refuse `qa50_*` / `s41val_` viewers | **Pass** (smoke: qa50 email → refuse) |
| Photos Approach A, ≥1 each | **Pass** (`syntheticPortraitPng`) |
| New `qa50:ranks-real` (not overload `qa50:ranks`) | **Pass** (`qa50:ranks` still v01–v04 only) |
| Demo default + score cycle | **Pass** |
| Candidates by partner genders | **Pass** (50 for M+F seeker) |
| Scoped delete `candidateProfileId startsWith qa50_` | **Pass** |
| non-qa50 ranks unchanged (before/after) | **Pass** (build asserts; verify prints preserved=1) |
| Analysis OUT | **Pass** |
| Fake login parked; real-me docs first | **Pass** |
| Local safety env | **Pass** |
| No UI / thresholds | **Pass** |

---

## Findings

### Fixed in this CR

**None.**

### Accepted / non-blocking

| Severity | Finding | Disposition |
|----------|---------|-------------|
| Info | `verify:qa50-real` prints non-qa50 count but does not re-run before/after | OK — build script enforces unchanged |
| Info | Live UI as real Google session | Deferred to Agent 3 |

### Required fixes for PASS

**None remaining.**

---

## Tests

```bash
npm run verify:qa50-real -- --email=shacharon@gmail.com --assert-demo
# PASS — 50 qa50 ranks HIGH=14 GOOD=18 OTHER=18; non-qa50 preserved=1

npm run qa50:ranks-real -- --email=qa50-v01@bondit-test.local
# Error: Refusing fixture viewer userId=qa50_user_v01

npm run qa50:ranks -- --demo
# v01–v04: 25 each; s41val unchanged (20)
```

---

## Agent 4

**Skip.**

---

## Agent 3 note

Safe to **ACCEPT** after logging in as the real user (e.g. `shacharon@gmail.com`) and confirming ≥5 cards on `/dating/me-matches`. Suggested commit:

```
test(qa): attach qa50 ranks to real local viewer with photos

Sprint QA local pool Story 4
```

---

## Next command

```text
--agent 3 sprint qa-pool story 4
```
