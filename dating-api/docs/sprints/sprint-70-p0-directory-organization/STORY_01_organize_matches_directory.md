# Story 01 — Organize matches/ Feature Folders

**Sprint:** 70  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM (111 files, cross-imports from me-profile, evaluate, admin)  
**Status:** **Done**  
**Branch:** `feature/sprint-70-story-1`  
**Handoffs:** [preflight](./handoffs/STORY_01_organize_matches_directory/agent--1-preflight.md) · [architect](./handoffs/STORY_01_organize_matches_directory/agent-0-architect.md) · [dev](./handoffs/STORY_01_organize_matches_directory/agent-1-dev.md) · [CR](./handoffs/STORY_01_organize_matches_directory/agent-2-review.md) · [PM](./handoffs/STORY_01_organize_matches_directory/agent-3-pm.md)

---

## Objective

Reduce `src/matches/` root from **111 flat files** to **≤15** by grouping into domain feature folders. Move-only — zero behavior changes.

---

## Shipped layout (locked)

```text
matches/
  README.md
  matches.module.ts                  # ROOT — Nest anchor
  matches.controller.ts
  matches-api.controller.ts
  matches.service.ts
  match.types.ts
  matches-directory.wiring.spec.ts

  admin/                             (2)
  api/                               (7) — daemon, pipeline, analytics, smoke specs
  children-unsure/                   (7)
  compare/                           (6 + compare-stages/ 9)
  engine/                            (17)
  explainability/
    core/                            (13)
    expansions/01-07/                (14)
    expansions/10-15/                (12)
  holy-grail/                        (8)
  match-narrative/                   (19) — EXISTING, no internal changes
  policies/                          (5)
  presentation/                      (10)
  recommendation/                    (5)
```

**Root after move: 7** files (5 TS + README + wiring spec) ✅

---

## Tasks

1. [x] **Agent 0:** Folder map + move manifest locked
2. [x] **Agent 1:** `git mv` files; fix internal + external imports (~39 files)
3. [x] Write `matches/README.md`
4. [x] Add `matches-directory.wiring.spec.ts`; update `smoke:matches`
5. [x] `npm test -- matches/` — no new failures vs **756/757** baseline

---

## Success

- [x] Root file count ≤15
- [x] Each feature folder ≤25 files
- [x] README with folder map
- [x] Tests: no new failures in `matches/`
- [x] External imports updated; `match-narrative/` path unchanged

---

## Verification (final)

| Metric | Before | After |
|--------|--------|-------|
| Root files | 111 | **7** |
| `npm test -- matches/` | 756/757 pass | **764/765 pass** (+8 wiring tests) |
| `matches-directory.wiring` | — | **8/8 pass** |
| `npm run smoke:matches` | old root path | **6/6 pass** (api smoke spec) |
| Pre-existing failure | `match-list-tldr` | unchanged (1 fail) |

---

## Key decisions

| Topic | Choice |
|-------|--------|
| Controllers | **Root** (beside module) |
| Explainability | Split `core/` + `expansions/01-07/` + `expansions/10-15/` |
| compare-stages | Under `compare/compare-stages/` |
| Build DoD | No **new** TS errors (pre-existing socket.io failures OK) |

**Pipeline:** `-1 → 0 → 1 → 2 → 3` ✅

---

## Next

Story 02 — [Organize me-profile/ feature folders](./STORY_02_organize_me_profile_directory.md)

```text
--agent -1 sprint 70 story 2
```
