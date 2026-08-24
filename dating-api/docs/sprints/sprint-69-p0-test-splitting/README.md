# Sprint 69 — P0 Test Splitting (Remaining Giants)

**Status:** Backend complete — FE Sprint 07 pending  
**Depends on:** Sprints 65, 67–68 Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api` (+ FE story in [`fe-sprint-07-p0-test-splitting`](../fe-sprint-07-p0-test-splitting/))  
**Round:** 5 (Post-launch-prep hygiene — **P0 only**)

---

## Goal

Split the **remaining** giant test files (>1000 LOC) so CI stays fast and failures are easy to isolate.

**Not an architecture change.** Mechanical describe-block splits + shared harness extraction — same pattern as Sprints 63 and 65.

---

## Why Now

Sprint 65 cleared the worst offenders. These **5 backend + 1 frontend** files were still P0:

| File | LOC | Split strategy | Status |
|------|-----|----------------|--------|
| ~~`engine/compute-friction.spec.ts`~~ | ~~1408~~ | Expansion tranches | ✅ Story 01 (`feature/sprint-69-story-1`) |
| ~~`me-profile/me-profile-http-crud.integration.spec.ts`~~ | ~~1390~~ | 4 CRUD route-family specs | ✅ Story 02 (`feature/sprint-69-story-2`) |
| ~~`me-profile/me-profile-http-conversations.integration.spec.ts`~~ | ~~1283~~ | 4 conversations route-family specs | ✅ Story 02 |
| ~~`me-profile/me-profile.service.spec.ts`~~ | ~~1347~~ | Method-family describes | ✅ Story 03 (`feature/sprint-69-story-3`) |
| ~~`me-profile/me-matches-eligibility.spec-support.ts`~~ | ~~1212~~ | fixtures + prisma-mock + harness | ✅ Story 04 (`feature/sprint-69-story-4`) |
| ~~`evaluate/evaluate.service.spec.ts`~~ | ~~1005~~ | Topic specs (orchestration/chips/…) | ✅ Story 04 |
| `dating-ui/.../match-why-section.spec.tsx` | 1059 | Expansion chip tranches | FE Sprint 07 |

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | Split compute-friction.spec | 1–2 days | ⚡ LOW | Done (`feature/sprint-69-story-1`) |
| 02 | Split me-profile HTTP giants | 2 days | ⚡ LOW | Done (`feature/sprint-69-story-2`) |
| 03 | [Split me-profile.service.spec](./STORY_03_split_me_profile_service_spec.md) | 1–2 days | ⚡ LOW | Done (`feature/sprint-69-story-3`) |
| 04 | [Thin evaluate spec + eligibility harness](./STORY_04_split_evaluate_and_harness.md) | 1–2 days | ⚡ LOW | Done (`feature/sprint-69-story-4`) |

**Order:** 01 → 02 → 03 → 04.

---

## Success Criteria

- [x] No backend spec file >1000 LOC (non-empty lines) — **on merged story branches**
- [x] `me-matches-eligibility.spec-support.ts` ≤600 LOC (barrel **18** LOC)
- [x] Test count unchanged per split (Stories 01–04)
- [x] Policy + wiring guards for evaluate, eligibility, service + HTTP families
- [ ] `npm test` green in `dating-api` (global green blocked by pre-existing failures)
- [ ] FE: `match-why-section` split ≤400 LOC per file (FE Sprint 07)

---

## What This Is NOT

- ❌ Not a service refactor (that's P1 — Sprint 71+)
- ❌ Not directory reorganization (that's Sprint 70)
- ❌ Not microservices / new architecture

**Architecture stays modular monolith.** We're reducing file size for velocity.

---

## Merge notes

Backend stories land on parallel branches — merge in order **01 → 02 → 03 → 04** (minimal overlap). After merge, proceed to [Sprint 70 directory organization](../sprint-70-p0-directory-organization/README.md).
