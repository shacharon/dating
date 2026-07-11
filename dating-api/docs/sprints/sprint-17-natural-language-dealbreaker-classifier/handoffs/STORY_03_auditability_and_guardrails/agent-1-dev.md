# Handoff: Agent 1 — Dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_auditability_and_guardrails.md](../../STORY_03_auditability_and_guardrails.md)  
**Sprint:** sprint-17-natural-language-dealbreaker-classifier  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- Guardrails choke (`applyDealbreakerGuardrails`) wired inside extract: confidence floor 0.9 + env kill switch `DEALBREAKER_HARD_DISABLED_TAGS`.
- Operator audit: HG eligibility audit rows + `MatchQualityAuditReport.holyGrailEligibility` with evidence/confidence; admin candidate page table.
- List telemetry: `event=hg_dealbreaker_outcomes` (`ME_MATCHES_HG_DEALBREAKER_OUTCOMES`).
- User visibility: `GET /me/profile` → `inferredDealbreakers`; preferences UI + en/es/he copy.
- Soft ranking untouched. NEVER_BLOCKS unchanged. No Prisma migration.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/holy-grail-matching/dealbreaker-guardrails.ts` (+ spec) | created |
| `dating-api/src/holy-grail-matching/dealbreaker-ambiguous-guardrails.spec.ts` | created |
| `dating-api/src/holy-grail-matching/dealbreaker-telemetry.ts` | created |
| `dating-api/src/holy-grail-matching/dealbreaker-signals-text.extract.ts` | updated — guardrails on return |
| `dating-api/src/holy-grail-matching/eligibility-audit.types.ts` | updated |
| `dating-api/src/holy-grail-matching/build-eligibility-audit.ts` | updated |
| `dating-api/src/holy-grail-matching/dealbreaker-eligibility.ts` | updated — looser signal type |
| `dating-api/src/me-profile/match-quality-audit.ts` | updated |
| `dating-api/src/me-profile/me-matches.service.ts` | updated — dealbreaker telemetry |
| `dating-api/src/me-profile/dto/me-profile-response.dto.ts` | updated |
| `dating-api/src/me-profile/me-profile.service.ts` | updated — `inferredDealbreakers` |
| `dating-api/src/logging/error-codes.ts` | updated |
| `dating-api/docs/ops/dealbreaker-kill-switch.md` | created |
| `dating-api/docs/engine/examples/dealbreaker-*.md` | created (3) |
| `dating-ui` preferences + i18n + admin match-quality | updated |

---

## Decisions (do not reverse without discussion)

- Guardrails applied inside `extractDealbreakerSignalsFromFreeText` (single choke).
- Kill switch = env + restart (no admin UI).
- Soft ranking still deferred (Option C).

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `npx jest src/holy-grail-matching --runInBand` → **258 passed**
- [x] `npx jest --no-coverage "me-new-model-e2e" --runInBand` → **66 passed** (baselines + dealbreaker Story 2 E2E unmodified)
- [x] `npx tsc -p tsconfig.build.json --noEmit` → pass
- [x] `prisma migrate deploy`: **N/A**
- [x] Browser Network smoke: **N/A** (no socket/cookie changes)
- [x] Socket transport: **N/A**

---

## E2E verification (agent 4 — required)

Agent 4 must add:

1. Kill switch: `DEALBREAKER_HARD_DISABLED_TAGS=smoking` → “don’t want smokers” + “I smoke” → **included**
2. `GET /api/v1/me/profile` → `inferredDealbreakers` contains smoking HARD_EXCLUDE + evidence when aboutPartner has “don’t want smokers”

Baseline + Story 2 dealbreaker specs stay unmodified.

---

## Deferred

- Soft ranking (Option C follow-up)
- Agent 4 kill-switch / profile E2E scenarios
- Persist signals to DB (optional later)

---

## Next agent

```text
--agent 2 sprint 17 story 3
```

**Notes for next agent:**

- Confirm guardrails choke + audit evidence + NEVER_BLOCKS intact.
- After CR → `--agent 4 sprint 17 story 3` (required).
