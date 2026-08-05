# Handoff: Agent 1 — Senior Dev — Sprint 42 Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_conversation_starters.md](../../STORY_01_conversation_starters.md)  
**Sprint:** sprint-42-conversation-intelligence  
**Date:** 2026-08-05  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Implemented `src/matches/conversation-starter/` (fact pack, prompt, validate, fallback, generator, Prisma cache) mirroring match-narrative.
- Added `ConversationStarterCache` + migration `20260805160000_conversation_starter_cache` (deployed locally).
- List DTO field `suggestedOpener: string | null`; HIGH-only attach with cache + ≤3 eager LLM gens; Redis `MATCH_LIST_CACHE_VERSION` **2 → 3**.
- UI left for Story 2. No `used`/`edited` write path. Skip Agent 4.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/matches/conversation-starter/**` | created (module + unit specs) |
| `prisma/schema.prisma` | `ConversationStarterCache` |
| `prisma/migrations/20260805160000_conversation_starter_cache/` | create table |
| `src/me-profile/me-matches.service.ts` | `suggestedOpener` + `attachSuggestedOpenersToListItems` |
| `src/me-profile/me-profile.module.ts` | register generator + cache |
| `src/cache/match-list-cache.ts` | version → 3 |
| `src/me-profile/me-matches.service.spec.ts` | opener mocks + attach specs |
| `dating-ui` | **unchanged** (Story 2) |

---

## Implementation notes

- Cache key: viewer/candidate profile + eval IDs + `CONVERSATION_STARTER_PROMPT_VERSION` (`v1`) — **not** MutualMatch id.
- LLM: `completeJSON`, `modelKey: 'fast'`, `purpose: 'conversation_starter'`, temp 0.7, maxTokens 80.
- Persist **LLM only**; fallback interest template returned in-response without upsert; `null` when no interest context.
- Attach runs after priority overlay on materialized path (same timing as whyTldr).
- Also restored list WHY lock: fallback narrative → `whyTldr: null` (was briefly building TLDR from fallback; existing attach test expects null).

---

## How to run

```bash
cd dating-api
npm run db:migrate
npx prisma generate   # if generate failed while API held the Prisma DLL, stop port 3001 first
npm run start:dev

npx jest src/matches/conversation-starter src/me-profile/me-matches.service.spec.ts --runInBand
```

---

## Tests / verification

- [x] Unit: conversation-starter + me-matches.service — **123 passed**
- [x] `prisma migrate deploy` — applied `20260805160000_conversation_starter_cache`
- [x] `tsc --noEmit` — clean
- [ ] Browser Network smoke: **deferred** (API field only; Story 2 UI). Manual: `GET /api/v1/me/matches` → HIGH items may include `suggestedOpener`
- [ ] Socket: N/A

---

## Deferred / Story 2

- Display opener on browse card + “Use this opener” prefill (no conversationId on browse yet).
- Optional detail DTO `suggestedOpener`.
- Mark `used` / `edited` (Story 3).

---

## Next agent

```text
--agent 2 sprint 42 story 1
```

**Notes for next agent:**

- Confirm HIGH-only + eager cap 3 + no MutualMatch FK.
- Confirm LLM upsert only; fallback not cached.
- Confirm list Redis version 3.
- Skip Agent 4 after CR → go to Agent 3.
