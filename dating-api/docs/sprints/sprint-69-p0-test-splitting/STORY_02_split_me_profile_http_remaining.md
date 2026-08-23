# Story 02 — Split Remaining Me-Profile HTTP Giants

**Sprint:** 69  
**Effort:** 2 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_02_split_me_profile_http_remaining/agent--1-preflight.md) · [architect](./handoffs/STORY_02_split_me_profile_http_remaining/agent-0-architect.md) · [dev](./handoffs/STORY_02_split_me_profile_http_remaining/agent-1-dev.md) · [CR](./handoffs/STORY_02_split_me_profile_http_remaining/agent-2-cr.md) · [PM](./handoffs/STORY_02_split_me_profile_http_remaining/agent-3-pm.md)

---

## Objective

Split the two HTTP integration specs Sprint 65 deferred (under 2000 LOC threshold but still P0 at >1200 LOC):

- `me-profile-http-crud.integration.spec.ts` (1390 LOC)
- `me-profile-http-conversations.integration.spec.ts` (1283 LOC)

Reuse existing harness: `me-profile-http.shared-harness.ts`.

---

## Target layout (shipped)

### CRUD (60 tests)

```
me-profile/
  me-profile-http-crud.spec-support.ts
  me-profile-http-crud-profile.integration.spec.ts       # lifecycle (22 tests)
  me-profile-http-crud-preferences.integration.spec.ts   # validation + preference fields (19)
  me-profile-http-crud-analysis.integration.spec.ts      # quality + analysis + submit (14)
  me-profile-http-crud-observability.integration.spec.ts
  me-profile-http-crud.wiring.spec.ts
```

### Conversations (53 tests)

```
me-profile/
  me-profile-http-conversations-list.integration.spec.ts
  me-profile-http-conversations-detail.integration.spec.ts
  me-profile-http-conversations-messages.integration.spec.ts   # incl. moderation + guardrails
  me-profile-http-conversations-read.integration.spec.ts
  me-profile-http-conversations.wiring.spec.ts
```

### Policy

```
me-profile/
  me-profile-http-spec-size.policy.spec.ts   # 750 LOC cap, both monoliths absent
```

Monoliths **`me-profile-http-crud.integration.spec.ts`** and **`me-profile-http-conversations.integration.spec.ts`** deleted.

---

## Tasks

1. [x] Map describe blocks / comment sections to target files (Agent 0)
2. [x] Move describes verbatim; `createCrudHttpIntegrationSuite()` + shared harness
3. [x] Wiring specs document baseline (**60** CRUD + **53** conversations)
4. [x] `me-profile-http-spec-size.policy.spec.ts` (750 LOC cap)
5. [x] `npm test -- me-profile-http` green; Sprint 63 split wiring updated (Agent 2)

---

## Success

- [x] Both monoliths deleted
- [x] No single me-profile HTTP spec >750 non-empty LOC (max: **549**)
- [x] Test count unchanged — **113** functional (+20 wiring/policy guards)
- [x] Harness stays ≤600 LOC (**513**, unchanged)

---

## Shipped

`feature/sprint-69-story-2` @ `3a0cefb`

- `f4f0dec` — test: split me-profile-http crud and conversations specs
- `3a0cefb` — test: update me-profile HTTP split wiring for story 02

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** CRUD validation failures → `me-profile-http-crud-preferences.spec.ts` (~549 LOC) instead of 1390 LOC monolith.

---

## SOLID / KISS

- **ISP:** Each spec imports only the harness helpers it needs.
- **KISS:** Move-only — no HTTP behavior changes.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
