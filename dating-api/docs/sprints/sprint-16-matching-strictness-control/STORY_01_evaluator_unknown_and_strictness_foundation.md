# Story 1: Evaluator foundation — UNKNOWN vs FAIL + per-dimension blocking policy

**Sprint:** 16
**Status:** Done
**Depends on:** Sprint 15 Story 1 (evaluator trimmed to `GENDER` / `AGE` / `PROXIMITY`); Story 0 E2E baseline

---

## Why

`dating-api/src/holy-grail-matching/eligibility.evaluator.ts` previously had exactly one outcome for "the fact is missing" and "the fact is known but wrong" — both were `FAIL`. This story built a distinct `UNKNOWN` status and a per-dimension blocking policy, with **zero** user-visible behavior change. [Sprint 17](../sprint-17-natural-language-dealbreaker-classifier/README.md) spends this capability.

---

## What

**As an** engineer
**I want** the evaluator to represent "counterparty fact missing/withheld" as a distinct `UNKNOWN` status, and to support a per-dimension policy for whether `UNKNOWN` blocks
**So that** future dimensions (Sprint 17 classifier tags) can degrade gracefully instead of hard-excluding

### Acceptance criteria

- [x] **New status:** `HolyGrailHardEligibilityStatus` gains `'UNKNOWN'`, distinct from `'PASS'` / `'FAIL'` / `'SKIPPED'` / `'SOFT_PASS'`.
- [x] **Reclassify existing branches:** missing/withheld gender and missing/invalid DOB return `UNKNOWN` (reason codes unchanged). Genuine mismatches stay `FAIL`.
- [x] **New type:** `HolyGrailDimensionBlockingPolicy = 'BLOCKS_ON_UNKNOWN' | 'NEVER_BLOCKS'` (supersedes earlier draft’s 3-tier `MUST_MATCH`/`PREFER`/`DONT_CARE` — locked in sprint README + architect handoff).
- [x] **Policy function:** `resolveDimensionOutcome(rawStatus, policy)` — `BLOCKS_ON_UNKNOWN` maps `UNKNOWN` → effective `FAIL` for overall; `NEVER_BLOCKS` leaves `UNKNOWN` non-blocking. Unit-tested for both policies × all 5 raw statuses.
- [x] **Hardcode current dimensions:** `GENDER`, `AGE`, `PROXIMITY` are `BLOCKS_ON_UNKNOWN` via constant map. No new API surface.
- [x] **Audit visibility:** legacy adapter maps evaluator `UNKNOWN` → `MatchingDimensionResults.UNKNOWN`.
- [x] **Telemetry:** `MeMatchesService.list` emits `event=hg_dimension_outcomes` (`ME_MATCHES_HG_DIMENSION_OUTCOMES`) with per-dimension PASS/FAIL/UNKNOWN/SKIPPED/SOFT_PASS counts.
- [x] **Tests:** unit matrix + UNKNOWN branch assertions; baseline E2E green unmodified (agent 4); full suite green (agent 2: 138 / 1441).

### Out of scope (this story)

- Any new user-facing preference field, UI, or i18n copy
- Turning `PROXIMITY` into something enforceable
- Changing `GENDER`/`AGE` away from `BLOCKS_ON_UNKNOWN`, or making them user-configurable
- Natural-language classifier / reintroducing education/religion/smoking/alcohol/children ([Sprint 17](../sprint-17-natural-language-dealbreaker-classifier/README.md))

---

## Pipeline (completed)

| Agent | Handoff | Verdict |
|-------|---------|---------|
| 0 Architect | `handoffs/.../agent-0-architect.md` | complete |
| 1 Dev | `handoffs/.../agent-1-dev.md` | complete |
| 2 Code review | `handoffs/.../agent-2-cr.md` | approved |
| 4 E2E | `handoffs/.../agent-4-e2e.md` | pass |
| 3 PM | `handoffs/.../agent-3-pm.md` | Done |

---

## Definition of done

- [x] `UNKNOWN` status exists and is distinct from `FAIL` in evaluator + audit types
- [x] `GENDER`/`AGE`/`PROXIMITY` net behavior is unchanged for every existing caller (regression + E2E baseline green)
- [x] `resolveDimensionOutcome` unit-tested for both blocking-policy values × all 5 raw statuses
- [x] Telemetry emits per-dimension outcome counts on matches list evaluations
- [x] Full `dating-api` test suite green
- [x] Agent 4 E2E handoff exists with passing verdict
