# Sprint 27 Quick Start

**Goal:** Execute match-list performance fixes with Cursor agents, one story at a time.

---

## How to run a story

Paste into chat:

```
Execute Sprint 27 Story N: <title from story file>
```

Example:

```
Execute Sprint 27 Story 1: Batch latest evaluations
```

Agent will: read the story → change code → run tests → commit.

---

## Order

1. Story 1 — Batch latest evaluations (**do first**)
2. Story 2 — SQL gender/age prefilter
3. Story 3 — Slim candidate select *(can parallel with 5 after 1)*
4. Story 4 — Cap candidate pool *(after 2)*
5. Story 5 — Miss-path observability *(can parallel with 3)*

---

## After each story

```powershell
cd C:\dev\piza\dating\dating-api
npm test -- --testPathPattern=me-matches|me-profile-analysis --runInBand
npm run build
```

Manual (optional): clear Redis match cache for a user, hit `GET /api/v1/me/matches`, confirm list still ranks correctly.

---

## When sprint is green

1. Push commits
2. Optional: k6 against local or cloud (`sprint-19` load-test script)
3. Stop and talk — next plate items (frontend realtime, auth harden, or async match materialization)
