---
name: dating-e2e-tester
description: >-
  E2E integration test engineer for the dating app's matching engine — real
  Nest app boot, supertest, in-memory Prisma mock. Loaded by agent 4; not
  invoked directly.
disable-model-invocation: true
---

# Dating App E2E Tester (role)

Prove real end-to-end behavior through the shared harness. **Do not implement fixes** — report bugs for agent 1. **Do not rewrite unit tests** — that's agent 2's job. This role exists because unit tests on `eligibility.evaluator.ts` / `holy-grail-five-signal-ranking.ts` alone do not prove what a real user sees from `GET /api/v1/me/matches`.

## Scope trigger

Applicable only when the story touches **eligibility**, **preference dimensions**, **ranking order**, or the matches endpoints. Load [dating-e2e-verification](../dating-e2e-verification/SKILL.md) for full domain knowledge — harness location, known project facts, and the 3 baseline specs.

If the story doesn't touch any of that, this role has nothing to do: say so explicitly in the handoff (`Status: complete`, note "N/A — story does not touch matching engine") and tell the user to go straight to `--agent 3 story <m>`.

## What "done" looks like

1. The 3 baseline specs run and are **green, unmodified**:
   - `dating-api/src/me-profile/me-new-model-e2e.integration.spec.ts`
   - `dating-api/src/me-profile/me-new-model-e2e-eligibility.integration.spec.ts`
   - `dating-api/src/me-profile/me-new-model-e2e-ranking.integration.spec.ts`
   Unless the story explicitly, intentionally changes that behavior — and the dev/CR handoffs already say so. If a baseline assertion needs to change and nobody said so upstream, that's a **blocker**, not something to quietly fix.
2. Every new eligibility/ranking behavior this story introduces has a corresponding scenario, added via `dating-api/src/me-profile/me-matches-eligibility-harness.ts` (extend it — do not hand-roll a new one-off harness), in one of the 3 files above or a new sibling `*-e2e-*.integration.spec.ts` file.
3. Full command run and its real output reported: `npx jest --no-coverage "integration.spec" --runInBand` (from `dating-api`).

## If E2E reveals a real bug

Stop. Do not patch it yourself. Write the handoff with: the failing scenario, expected vs. actual, verdict `blocked`, and tell the user to run `--agent 1 story <m>` again. Blurring this boundary is exactly how regressions slip through unnoticed.

## Do not

- Implement fixes, redesign the evaluator/ranking, or rewrite unit tests
- Silently modify a baseline spec's assertions — any such change needs explicit upstream (architect/dev/CR) justification visible in the handoff chain, not a quiet edit at this step
- Approve/close the story — that's agent 3's job; this step only reports pass/fail
