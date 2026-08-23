# Technical Debt Summary - Ranked Issues

**Scan Date:** 2026-08-23  
**Full Report:** [TECHNICAL_DEBT_SCAN_POST_SPRINT_67_68.md](./TECHNICAL_DEBT_SCAN_POST_SPRINT_67_68.md)

---

## Top 23 Issues (Ranked by Priority)

### 🔴 P0 - CRITICAL (Block Productivity)

| # | Issue | Specific Files/Paths | Metric | Why It Matters | Effort | 
|---|-------|---------------------|--------|----------------|--------|
| 1 | **Giant test files** | `compute-friction.spec.ts` | 1408 LOC | 30min debug sessions, parallel execution blocked | 8-10 days |
| | | `me-profile-http-crud.integration.spec.ts` | 1390 LOC | |  |
| | | `me-profile.service.spec.ts` | 1347 LOC | |  |
| | | `me-profile-http-conversations.integration.spec.ts` | 1283 LOC | |  |
| | | `me-matches-eligibility.spec-support.ts` | 1212 LOC | |  |
| 2 | **God directories** | `src/matches/` | 111 files | 10-15s to find files, merge conflicts | 3-5 days |
| | | `src/me-profile/` | 103 files | |  |
| 3 | **UI giant test** | ~~`match-why-section.spec.tsx`~~ → 4 tranches (max 369 LOC) | ~~1059 LOC~~ **Done (FE Sprint 07)** | UI test debugging nightmare | ~~3-4 days~~ |

### 🟡 P1 - HIGH PRIORITY (Block Refactoring)

| # | Issue | Specific Files/Paths | Metric | Why It Matters | Effort |
|---|-------|---------------------|--------|----------------|--------|
| 4 | **God services >200 LOC** | ~~`match-ranking.service.ts`~~ → orchestrator 104 LOC + 4 collaborators (Sprint 71 S01) | ~~544 LOC~~ **Done** | Hard to test, violates SRP | ~~2-3 days each~~ |
| | | ~~`matches.service.ts`~~ → facade 116 LOC + 4 collaborators (Sprint 71 S02) | ~~503 LOC~~ **Done** | |  |
| | | ~~`me-conversations.service.ts`~~ → facade 77 LOC + 3 collaborators (Sprint 71 S03) | ~~405 LOC~~ **Done** | |  |
| | | ~~`match-detail.service.ts`~~ → facade 37 LOC + query/photo (Sprint 71 S04) | ~~357 LOC~~ **Done** | |  |
| | | 16 more services >200 LOC | | |  |
| 5 | **God mapper class** | `profile-to-canonical.mapper.ts` | 55 methods | God object anti-pattern | 3-5 days |
| | | | 704 LOC | |  |
| 6 | **Large non-test files** | `dealbreaker-signals-text.extract.ts` | 761 LOC | Frozen (Sprint 52) - intentional | N/A (frozen) |
| | | `tension-rules.ts` | 721 LOC | 72 rules array, could be modular | 2-4 days |
| | | `openai.client.ts` | 600 LOC | Client + retry + telemetry | 2-3 days |
| | | 7 more files >500 LOC | | |  |
| 7 | **Missing module READMEs** | `src/matches/` (111 files) | 0 READMEs | New devs lost, no architecture docs | 2-3 hrs each |
| | | `src/me-profile/` (103 files) | |  |  |
| | | `src/extraction/` (55 files) | |  |  |
| | | `src/holy-grail-matching/` (48 files) | |  |  |
| | | 8 major modules total | |  |  |
| 8 | **Frontend god directories** | `src/lib/` | 104 files | Poor organization | 5-7 days |
| | | `src/components/` | 58 files | |  |  |
| 9 | **Backend god directories** | `src/extraction/` | 55 files | LLM + shadow tests + telemetry mixed | 3-5 days |
| | | `src/holy-grail-matching/` | 48 files | |  |  |
| 10 | **God classes >10 methods** | `messaging-socket-registry.service.ts` | 48 methods | Too many responsibilities | 3-4 days |
| | | `match-explainability.ts` | 45 methods | |  |  |
| | | 13 more classes >10 methods | | |  |

### 🟢 P2 - MEDIUM (Code Quality)

| # | Issue | Specific Files/Paths | Metric | Why It Matters | Effort |
|---|-------|---------------------|--------|----------------|--------|
| 11 | **console.log in production** | `compatibility-score.ts` | 1 instance | Not captured by observability | 1-2 days |
| | | `observability/*.ts` | 2 instances | |  |
| | | Scripts (acceptable) | ~50 instances | |  |
| 12 | **Test harness bloat** | `me-matches-eligibility.spec-support.ts` | 1212 LOC | Test code as complex as production | 3-4 days |
| | | `me-profile-http.shared-harness.ts` | 520 LOC | |  |
| 13 | **No API documentation** | No Swagger setup | N/A | Frontend must read controller code | 3-5 days |
| 14 | **Magic numbers** | Various files | ~50 instances | Hard to understand business rules | 2-3 days |
| 15 | **Incomplete DIP** | Direct Prisma/Redis usage | Few cases | Harder to test | 4-5 days |

---

## Metrics Summary

### Backend (dating-api)
- 841 TypeScript files
- 80 services (20 are >200 LOC)
- 5 test files >1000 LOC
- 10 non-test files >500 LOC
- 2 god directories (>100 files)
- 15 classes with >10 methods
- 1 module README (out of ~20 modules)

### Frontend (dating-ui)
- 419 files
- 0 test files >1000 LOC (was 1 — FE Sprint 07 split `match-why-section`)
- 2 god directories (>50 files)
- 0 module READMEs

---

## Quick Action Plan

### Sprint 69 — P0 test splits (5–8 days)
- [ ] [Sprint 69 Story 1](./sprints/sprint-69-p0-test-splitting/STORY_01_split_compute_friction_spec.md) — `compute-friction.spec.ts`
- [ ] [Sprint 69 Story 2](./sprints/sprint-69-p0-test-splitting/STORY_02_split_me_profile_http_remaining.md) — CRUD + conversations HTTP specs
- [ ] [Sprint 69 Story 3](./sprints/sprint-69-p0-test-splitting/STORY_03_split_me_profile_service_spec.md) — `me-profile.service.spec.ts`
- [ ] [Sprint 69 Story 4](./sprints/sprint-69-p0-test-splitting/STORY_04_split_evaluate_and_harness.md) — evaluate spec + eligibility harness
- [x] [FE Sprint 07](./sprints/fe-sprint-07-p0-test-splitting/README.md) — `match-why-section` split into expansion tranches ✅

### Sprint 70 — P0 directory organization (4–6 days)
- [ ] [Sprint 70 Story 1](./sprints/sprint-70-p0-directory-organization/STORY_01_organize_matches_directory.md) — `matches/` feature folders + README
- [ ] [Sprint 70 Story 2](./sprints/sprint-70-p0-directory-organization/STORY_02_organize_me_profile_directory.md) — `me-profile/` feature folders + README

**Agent commands:** [ROUND3_AGENT_COMMANDS.md](./sprints/ROUND3_AGENT_COMMANDS.md) (Sprints 69–70, FE-07)

### Backlog — P1 (Sprint 71–72, after P0 clear)
- [x] [Sprint 71 Story 1](./sprints/sprint-71-p1-god-services/STORY_01_decompose_match_ranking.md) — `match-ranking` pipeline split (orchestrator 104 LOC) ✅
- [x] [Sprint 71 Story 2](./sprints/sprint-71-p1-god-services/STORY_02_decompose_matches_service.md) — legacy `matches.service` split (facade 116 LOC) ✅
- [x] [Sprint 71 Story 3](./sprints/sprint-71-p1-god-services/STORY_03_decompose_me_conversations.md) — `me-conversations` split (facade 77 LOC) ✅
- [x] [Sprint 71 Story 4](./sprints/sprint-71-p1-god-services/STORY_04_thin_match_detail.md) — `match-detail` split (facade 37 LOC) ✅
- [ ] [Sprint 72 preview](./sprints/sprint-72-p1-mapper-and-thin-services/README.md) — `profile-to-canonical.mapper.ts` + remaining 200–348 LOC services

### Backlog — P2+
- [ ] Frontend `src/lib/` organization
- [ ] Add Swagger documentation

---

## "Regular Suspects" Status ✅

User mentioned these would still be problematic - confirmed:

| Area | Status | Details |
|------|--------|---------|
| **Match/me-profile directories** | ❌ Still messy | matches: 111 files, me-profile: 103 files |
| **Test files giant** | ❌ Still giant | 5 files >1000 LOC, 1 file >1400 LOC |
| **Services too large** | ❌ Still too large | 20 services >200 LOC |
| **Missing documentation** | ❌ Still missing | 1 README out of ~20 modules |

**Bottom line:** The user's suspicions were 100% correct. These areas need immediate attention.

---

**End of Summary**
