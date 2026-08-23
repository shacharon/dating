# Story 02 — Organize me-profile/ Feature Folders



**Sprint:** 70  

**Effort:** 2–3 days  

**Risk:** ⚠️ MEDIUM (103 flat files; HTTP specs; worker ports)  

**Status:** **Done**  

**Branch:** `feature/sprint-70-story-2` (from Story 01 tip)  

**Handoffs:** [preflight](./handoffs/STORY_02_organize_me_profile_directory/agent--1-preflight.md) · [architect](./handoffs/STORY_02_organize_me_profile_directory/agent-0-architect.md) · [dev](./handoffs/STORY_02_organize_me_profile_directory/agent-1-dev.md) · [CR](./handoffs/STORY_02_organize_me_profile_directory/agent-2-review.md) · [PM](./handoffs/STORY_02_organize_me_profile_directory/agent-3-pm.md)



---



## Objective



Reduce `src/me-profile/` root from **103 flat files** to **≤15** by moving flat files into existing and new feature folders.



**Already organized (keep path, extend where noted):**



- `matches/` → sub-split into `core/`, `list/`, `rank/`, `detail/`, `actions/`, `support/`

- `profile/` — extend with root profile services (18 total)

- `repositories/` — Prisma repos (27 files, grandfathered)

- `dto/` (14), `validators/` (3) — unchanged



---



## Shipped layout (locked)



```text

me-profile/

  README.md

  me-profile.module.ts

  me-profile.controller.ts

  me-profile.dto.ts

  me-profile.errors.ts

  me-profile-validation.pipe.ts

  me-profile-directory.wiring.spec.ts



  dto/                          (14) unchanged

  validators/                   (3) unchanged

  repositories/                 (27) unchanged



  profile/                      (18)

  conversations/                (22)

  integration/                  (14) — HTTP + WS specs + harness only

  e2e/                          (9)

  contracts/                    (4)



  matches/

    core/                       (6)

    list/                       (18)

    rank/                       (10)

    detail/                     (5)

    actions/                    (12)

    support/                    (5)

```



**Root after move: 7** (+ README + wiring) ✅



---



## Tasks



1. [x] **Agent 0:** Finalize manifest; `me-profile-matches.service` → `matches/core/`

2. [x] **Agent 1:** `git mv` files; fix internal + external imports (~31 files)

3. [x] Write `me-profile/README.md`

4. [x] Add `me-profile-directory.wiring.spec.ts`; update package scripts

5. [x] `npm test -- me-profile/` — no new failures vs **699/716** baseline



---



## Success



- [x] Root file count ≤15

- [x] Each feature folder ≤25 (repositories/ grandfathered at 27)

- [x] README with folder map

- [x] Tests: no new failures in `me-profile/`

- [x] `integration/` contains only HTTP specs + harness



---



## Key decisions



| Topic | Choice |

|-------|--------|

| `me-profile-matches.service` | **`matches/core/`** |

| `matches/` cap | Sub-split: core, list, rank, detail, actions, support |

| `repositories/` | No moves (27 files grandfathered) |

| WS integration spec | **`integration/`** |

| Build DoD | No **new** TS errors |



**Pipeline:** `-1 → 0 → 1 → 2 → 3`



---



## Next



Sprint 70 Story 02 closed. Commit + PR when ready.


