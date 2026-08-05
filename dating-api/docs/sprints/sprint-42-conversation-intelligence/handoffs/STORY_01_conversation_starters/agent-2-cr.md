# Handoff: Agent 2 — Code Review — Sprint 42 Story 1

**Agent:** 2 code-review  
**Story:** [STORY_01_conversation_starters.md](../../STORY_01_conversation_starters.md)  
**Sprint:** sprint-42-conversation-intelligence  
**Date:** 2026-08-05  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)

**Verdict:** **approved (fixed)** — Major grounding gap fixed; tests green.

---

## Summary

- Reviewed implementation against Architect lock: HIGH-only, ≤3 eager, profile+eval+promptVersion cache (no MutualMatch FK), LLM upsert only, Redis list cache v3, no about* in prompts.
- **Major fixed:** LLM openers were not grounded to fact-pack interests/chips — inventions (e.g. “Japan trip”) could pass validate. Added soft grounding in `validateLlmOpener(opener, factPack)`.
- Added attach edge tests: hardBlocked skip, generator rejection swallowed via `Promise.allSettled`.
- Skip Agent 4 (not eligibility/ranking). Next → Agent 3.

---

## Checklist vs Architect / Story CR

| Check | Result |
|-------|--------|
| Prompt has chips + interests + nicknames (no about*) | Pass |
| LLM failure does not block list | Pass (`allSettled` + catch in generator) |
| Cache key = profiles + evals + promptVersion | Pass |
| No MutualMatch / conversationId FK | Pass |
| Persist LLM only; fallback not upserted | Pass |
| HIGH only; eager ≤3 | Pass |
| Migration `ConversationStarterCache` | Pass |
| Redis `MATCH_LIST_CACHE_VERSION === 3` | Pass |
| Fallback or null (never generic Hey) | Pass |
| Materialized attach after rank/tier overlay | Pass |

---

## Issues

### Critical
- None

### Major (fixed)
1. **Ungrounded LLM openers** — `validateLlmOpener` ignored fact pack → invented content could be cached.  
   **Fix:** require at least one grounding token from shared interests / note labels / chips when those exist; else → fallback/null. Specs cover invent → fallback.

### Minor (accepted / deferred)
1. Sequential per-item cache `find` (N+1) — same pattern as whyTldr; OK for HIGH-only pages.
2. `sharedInterests[]` not passed from engine on list path — `sharedInterestNote` still in fact pack; Architect open Q #2 acceptable for v1.
3. Persistent LLM fail → re-attempt on each list load for uncapped misses (no negative cache) — same as narrative; Agent 3 cost note.
4. No HTTP integration test for `suggestedOpener` on `GET /me/matches` — unit coverage sufficient for Story 1; Agent 3 can smoke in browser/Network.

---

## Fixes / tests added

| Path | Change |
|------|--------|
| `conversation-starter-validate.ts` | grounding + `parseSharedInterestLabels` (no circular import) |
| `conversation-starter-fallback.ts` | import parse from validate |
| `conversation-starter.generator.ts` | pass `factPack` into validate |
| `*.spec.ts` (validate, generator, attach) | ungrounded reject; hardBlocked; generate reject |

---

## Tests / verification

```bash
cd dating-api
npx jest src/matches/conversation-starter src/me-profile/me-matches.service.spec.ts --runInBand
```

- [x] Result: **128 passed**
- [x] `prisma migrate deploy`: already applied in Agent 1
- [ ] Browser Network smoke: **deferred** (API field; Story 2 UI) — Agent 3 may spot-check `suggestedOpener` on HIGH list JSON
- [ ] Socket: N/A
- [ ] Runtime topology: N/A (REST list field only)
- [ ] Agent 4 E2E: **N/A** — skip

---

## Remaining for Agent 3

- Manual opener quality review (sample set; ≥80% ≥7/10).
- Confirm cache hit on second list load (no duplicate LLM for same eval pair).
- Document samples if useful (`SAMPLE_OPENERS.md` optional).

---

## Next agent

```text
--agent 3 sprint 42 story 1
```

**Notes:** Skip Agent 4. UI / “Use this opener” is Story 2.
