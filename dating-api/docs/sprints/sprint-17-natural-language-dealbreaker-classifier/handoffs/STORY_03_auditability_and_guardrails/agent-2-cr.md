# Handoff: Agent 2 — Code Review — Story 3

**Agent:** 2 code-review  
**Story:** [STORY_03_auditability_and_guardrails.md](../../STORY_03_auditability_and_guardrails.md)  
**Sprint:** sprint-17-natural-language-dealbreaker-classifier  
**Date:** 2026-07-11  
**Status:** complete  

**Verdict:** **fixed**

---

## Summary

- Reviewed guardrails choke, audit evidence trail, telemetry, profile `inferredDealbreakers`, UI i18n. Soft ranking absent (Option C). NEVER_BLOCKS intact.
- **Fixed Major:** match-quality audit could not surface dealbreaker exclusions because `getById` 404s on HG FAIL — now builds report with `holyGrailEligibility` even when detail is unavailable.
- **Fixed Major:** kill-switch env sticky cache blocked same-process Agent 4 env toggles — re-read `process.env` each call.
- Added unit tests for eligibility-audit dealbreaker join + telemetry formatters.
- **Agent 4 required next** — kill switch + profile inferredDealbreakers HTTP scenarios.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/match-quality-audit.ts` | updated (CR — audit on hard-exclude) |
| `dating-api/src/holy-grail-matching/dealbreaker-guardrails.ts` | updated (CR — no sticky env cache) |
| `dating-api/src/holy-grail-matching/build-eligibility-audit.spec.ts` | created |
| `dating-api/src/holy-grail-matching/dealbreaker-telemetry.spec.ts` | created |
| `dating-api/docs/ops/dealbreaker-kill-switch.md` | updated |
| Agent 1 wiring | reviewed OK |

---

## Decisions (do not reverse without discussion)

- Option C stands — no soft ranking.
- Agent 4 must prove kill switch + `inferredDealbreakers` over real HTTP harness.
- Admin audit for excluded candidates is intentional Story 3 AC (evidence for silent hard excludes).

---

## Issues found

### Critical
- None

### Major
1. **Admin audit blind on hard-exclude** — `buildMatchQualityAuditJson` required successful `getById`, which throws when HG FAIL. **Fixed** — catch `NotFoundException`, still emit `holyGrailEligibility` with evidence.
2. **Kill-switch sticky cache** — first extract cached empty set; Agent 4 setting `DEALBREAKER_HARD_DISABLED_TAGS` mid-process would no-op. **Fixed** — re-read env each call.

### Minor
1. `guardrailDemoted` field on audit rows unused (demoted tags never enter eligibility) — acceptable; type retained for future.
2. Match-quality audit does extra profile fetches for HG slice — fine for admin path.

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `npx jest --no-coverage src/holy-grail-matching src/admin/admin-match-quality --runInBand` → **297 passed**
- [x] `npx jest --no-coverage "me-new-model-e2e" --runInBand` → baselines green
- [x] `npx tsc -p tsconfig.build.json --noEmit` → pass
- [x] `prisma migrate deploy`: N/A
- [x] Browser Network smoke: N/A
- [x] Socket transport: N/A

Confirmed: no soft overlay; baseline E2E specs unmodified this story.

---

## E2E verification (agent 4 — required)

- [ ] Baseline + Story 2 dealbreaker specs still green unmodified — **Agent 4 must confirm**
- [ ] New scenarios:
  1. `DEALBREAKER_HARD_DISABLED_TAGS=smoking` + don’t want smokers + I smoke → **included**
  2. `GET /api/v1/me/profile` → `inferredDealbreakers` with smoking HARD_EXCLUDE + evidence
- [ ] Bug requiring `--agent 1`: none from CR after fixes

**Next must be `--agent 4` — do not skip to PM.**

---

## Open questions / blockers

- Soft ranking still deferred (C).

---

## Next agent

```text
--agent 4 sprint 17 story 3
```

**Notes for next agent:**

- Set `process.env.DEALBREAKER_HARD_DISABLED_TAGS` in the kill-switch scenario (env re-read each extract — no cache reset required, but clear env in `afterEach`).
- Use `EligibilityTestHarness`; do not modify baseline assertions.
- Profile inferredDealbreakers can be asserted via harness `createProfile` + GET profile if harness exposes it, or extend harness with `getProfile`.
