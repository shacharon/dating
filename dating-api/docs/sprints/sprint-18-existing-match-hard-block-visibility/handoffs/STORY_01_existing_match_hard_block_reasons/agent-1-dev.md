# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_existing_match_hard_block_reasons.md](../../STORY_01_existing_match_hard_block_reasons.md)  
**Sprint:** sprint-18-existing-match-hard-block-visibility  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- Existing hard FAIL matches (viewer `LIKE` **or** ACTIVE `MutualMatch`) stay on list/detail with `hardBlocked` + multi-reason quotes; new hard FAILs still omitted.
- Pure `hard-block-reasons.ts` builder; wired in `MeMatchesService.list` / `getById`; blocked rows sort to list bottom.
- UI list + detail show disabled treatment + i18n reasons (en/es/he); Like/Pass hidden when hard-blocked with no prior action.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/holy-grail-matching/hard-block-reasons.ts` | created |
| `dating-api/src/holy-grail-matching/hard-block-reasons.spec.ts` | created |
| `dating-api/src/holy-grail-matching/index.ts` | updated — exports |
| `dating-api/src/me-profile/me-matches.service.ts` | updated — FAIL branch, mutuals batch, DTO |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | updated — `mutualMatch.findMany` mock |
| `dating-api/src/me-profile/me-matches.v1-contract.spec.ts` | updated — mock |
| `dating-api/src/me-profile/me-matches-eligibility-harness.ts` | updated — `mutualMatch.findMany` |
| `dating-api/src/me-profile/me-new-model-e2e.integration.spec.ts` | updated — mock |
| `dating-ui/src/lib/me-profile-api.ts` | updated — `hardBlocked` DTO |
| `dating-ui/src/app/dating/me-matches/hard-block-display.ts` | created |
| `dating-ui/src/app/dating/me-matches/page.tsx` | updated |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | updated |
| `dating-ui/src/lib/i18n/{types,en,es,he}.ts` | updated |
| Prisma | **N/A — no migration** |
| E2E existing-vs-new sibling | **deferred to Agent 4** |

---

## Decisions (do not reverse without discussion)

- Followed architect locks: existing = LIKE **or** ACTIVE mutual; PASS-only still omitted; blocked sort bottom; keep Liked chip.
- Extended `buildHardBlockReasons` with optional `counterpartySignals` + `viewerSelfHints` so `them_to_viewer` can quote both sides (architect signature was viewer-signals + counterparty-hints only).
- `getById`: existing FAIL → 200 + `hardBlocked`; non-existing FAIL → 404 unchanged.
- No API rejection of LIKE on hard-blocked (out of scope); UI disables Like/Pass / undo-like.

---

## Runtime topology

N/A — REST only.

---

## Tests / verification

- [x] Unit: `npx jest src/holy-grail-matching/hard-block-reasons.spec.ts --runInBand --no-coverage` → **8 passed**
- [x] Unit: `npx jest src/me-profile/me-matches.service.spec.ts --runInBand --no-coverage` → **74 passed**
- [x] `npx tsc --noEmit -p tsconfig.json` (dating-api) → pass
- [x] Baseline E2E `npx jest --no-coverage "me-new-model-e2e" --runInBand` → pass (harness mock only; assertions unmodified)
- [x] `prisma migrate deploy`: **N/A**
- [x] Browser Network smoke: **deferred** (behavior-only; Agent 4 E2E covers list inclusion)
- [x] Socket transport: **N/A**

---

## E2E verification (agent 4)

Agent 4 **required**. New sibling e.g. `me-new-model-e2e-hard-block-existing.integration.spec.ts`:

1. New FAIL (no LIKE) → omitted  
2. LIKE then counterparty becomes smoker → included + `hardBlocked.disabled` + smoking reasons/quotes  
3. Soft / no LIKE FAIL → still omitted  

Baseline Sprint 16/17 specs must stay **unmodified** in assertions (harness mock only).

---

## Open questions / blockers

- None

---

## Next agent

```text
--agent 2 sprint 18 story 1
```

**Notes for next agent:**

- After CR → `--agent 4 sprint 18 story 1` (required), then `--agent 3`.
- Harness already has `mutualMatch.findMany` default `[]`; Agent 4 should seed LIKE / mutual for Scenario B.
