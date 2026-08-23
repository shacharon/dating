# Sprint 69 — P0 Test Splitting (Remaining Giants)

**Status:** Ready  
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

Sprint 65 cleared the worst offenders (`extraction.service.spec`, `match-engine.spec`, matches HTTP monolith). These **5 backend + 1 frontend** files are still P0:

| File | LOC | Split strategy |
|------|-----|----------------|
| ~~`engine/compute-friction.spec.ts`~~ | ~~1408~~ | ✅ Split — core + 4 shadow tranches + policy (Story 01) |
| `me-profile/me-profile-http-crud.integration.spec.ts` | 1390 | Route-family describes (profile CRUD, analysis, preferences, observability) |
| `me-profile/me-profile.service.spec.ts` | 1347 | Method-family describes (submit, analysis, moderation, rank rebuild) |
| `me-profile/me-profile-http-conversations.integration.spec.ts` | 1283 | Already has sprint-story describes — one file per route group |
| `me-profile/me-matches-eligibility.spec-support.ts` | 1212 | Extract fixtures; keep as support, target ≤600 LOC |
| `evaluate/evaluate.service.spec.ts` | 1005 | Runner/pipeline describes |
| `dating-ui/.../match-why-section.spec.tsx` | 1059 | Expansion chip tranches (FE Sprint 07) |

---

## Principles (mandatory)

- **SRP:** One spec file = one test concern (route family, expansion tranche, or service method group).
- **KISS:** Move describes verbatim — no assertion rewrites, no “while we’re here” refactors.
- **DIP for tests:** Shared setup → `*.spec-support.ts` or existing harness files; specs import helpers, not copy-paste.
- **Policy guards:** Add `*-spec-size.policy.spec.ts` where Sprint 65 did (max LOC + monolith absence).

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Split compute-friction.spec](./STORY_01_split_compute_friction_spec.md) | 1–2 days | ⚡ LOW | Done |
| 02 | [Split me-profile HTTP giants](./STORY_02_split_me_profile_http_remaining.md) | 2 days | ⚡ LOW | Ready |
| 03 | [Split me-profile.service.spec](./STORY_03_split_me_profile_service_spec.md) | 1–2 days | ⚡ LOW | Ready |
| 04 | [Thin evaluate spec + eligibility harness](./STORY_04_split_evaluate_and_harness.md) | 1–2 days | ⚡ LOW | Ready |

**Order:** 01 → 02 → 03 → 04 (independent enough to parallelize 01 + 04 if needed).

**Frontend P0:** [FE Sprint 07 — match-why-section split](../fe-sprint-07-p0-test-splitting/README.md) (Story 1).

---

## Success Criteria

- [ ] No backend spec file >1000 LOC (non-empty lines)
- [ ] `me-matches-eligibility.spec-support.ts` ≤600 LOC (fixtures only, no test cases)
- [ ] Test count unchanged per split (or documented intentional dedup)
- [ ] Policy guards for new split families where applicable
- [ ] `npm test` green in `dating-api`
- [ ] FE: `match-why-section` split ≤400 LOC per file (FE Sprint 07)

---

## What This Is NOT

- ❌ Not a service refactor (that's P1 — Sprint 71+)
- ❌ Not directory reorganization (that's Sprint 70)
- ❌ Not microservices / new architecture

**Architecture stays modular monolith.** We're reducing file size for velocity.
