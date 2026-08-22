# Story 03 — Thin Remaining 1k+ Specs

**Sprint:** 65  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [architect](./handoffs/story-03-thin-remaining-specs/agent-0-architect.md) · [dev](./handoffs/story-03-thin-remaining-specs/agent-1-dev.md) · [CR](./handoffs/story-03-thin-remaining-specs/agent-2-cr.md) · [PM](./handoffs/story-03-thin-remaining-specs/agent-3-pm.md)

---

## Objective

Optional: thin remaining large specs if blocking mobile velocity.

**Shipped scope:** **Scope A only** — sub-split `me-profile-http-matches.integration.spec.ts` (2360 non-empty LOC, 73 tests).

---

## Target layout (shipped)

```
me-profile/
  me-profile-http.shared-harness.ts                           KEEP
  me-profile-http-matches.spec-support.ts                     NEW
  me-profile-http-matches-list-detail.integration.spec.ts     NEW
  me-profile-http-matches-narrative-feedback.integration.spec.ts NEW
  me-profile-http-matches-actions.integration.spec.ts         NEW
  me-profile-http-matches-mutual.integration.spec.ts            NEW
  me-profile-http-matches-spec-size.policy.spec.ts            NEW (Agent 2)
  me-profile-http-matches.integration.spec.ts                 DELETE
```

Wiring + `validate:phase2-me-profile` script updated.

---

## Deferred candidates

| File | LOC | Action |
|------|-----|--------|
| `me-profile-http-crud.integration.spec.ts` | ~1390 | Defer — under 2000 threshold |
| `me-profile-http-conversations.integration.spec.ts` | ~1283 | Defer |
| `me-profile.service.spec.ts` | ~1347 | Defer |
| `engine/compute-friction.spec.ts` | ~1408 | Out of scope |
| `evaluate/evaluate.service.spec.ts` | ~1005 | Out of scope |

---

## Tasks

1. [x] Shared matches support (`me-profile-http-matches.spec-support.ts`)
2. [x] Sub-split monolith → 4 integration specs by endpoint cluster
3. [x] Delete monolith; preserve **73** tests
4. [x] Update wiring spec + `validate:phase2-me-profile`
5. [x] Policy guard for LOC + monolith absence (Agent 2)

---

## Success

- [x] No single split matches spec >1000 non-empty LOC (max: 748)
- [x] All me-profile HTTP tests green (205/205 PM re-run)
- [x] 73 monolith tests preserved across 4 split files
- [x] Selective runs documented — e.g. `me-profile-http-matches-list-detail` for list/detail only

---

## Shipped

`feature/sprint-65-story-3` @ `528b7f8`

- `e5c8d66` — test: sub-split me-profile-http-matches integration spec
- `528b7f8` — test: add me-profile-http-matches spec size policy

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agent 4 N/A)

**Note:** Zero production code changes — test + package script only.
