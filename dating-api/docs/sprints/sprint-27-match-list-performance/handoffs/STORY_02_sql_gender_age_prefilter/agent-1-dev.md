# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_sql_gender_age_prefilter.md](../../STORY_02_sql_gender_age_prefilter.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

List rebuild `findMany` now applies **viewer→candidate** gender (`gender in …`) and age (`birthDate` UTC bounds) via pure helper `buildMatchCandidateSqlPrefilterWhere`. Reciprocal product gender + HG Layer 3 unchanged (dual-run comment on where). `count` / base where unchanged. Empty/open prefs omit clauses.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| SQL only on list `findMany` photo-eligible path | Pass |
| Gender from viewer product allowlist; empty → omit | Pass |
| Age only when non-empty pref row + min/max set | Pass |
| UTC bounds parity with `ageWholeYearsUtcFromYmd` | Pass |
| Reciprocal gender still in memory | Pass |
| Count / base where unchanged | Pass |
| No migration / no API DTO change | Pass |
| Eligibility harness honors gender/birthDate where | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `me-matches-candidate-sql-prefilter.ts` | Pure helper + UTC calendar math |
| `me-matches-candidate-sql-prefilter.spec.ts` | Empty/gender/age/birthday edge tests |
| `me-matches.service.ts` | Wire prefilter into `matchCandidatePhotoEligibleWhere`; dual-run comment |
| `me-matches.service.spec.ts` | Assert where gender/age; update runtime contract |
| `me-matches-eligibility-harness.ts` | Filter `findMany` by gender / birthDate |

---

## Verification ran

| Check | Result |
|-------|--------|
| prefilter + me-matches + v1-contract + eligibility e2e | **121 passed** |
| `npm run build` | **OK** |

---

## Agent 2 note

- Confirm reciprocal path untouched; SQL is viewer→cand only.
- Confirm open prefs produce no `gender` / `birthDate` keys.
- Birthday bound examples: asOf `2026-08-01`, min 25 → `lte 2001-08-01`; max 40 → `gte 1985-08-02`.

---

## Commit

`perf(matches): prefilter match candidates by gender and age in SQL` — Sprint 27 Story 2.
