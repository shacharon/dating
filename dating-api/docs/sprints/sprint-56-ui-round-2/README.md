# Sprint 56 — UI Round 2 (beyond Sprint 47) (P1)

**Status:** In progress (Story 01 WIP)  
**Depends on:** Sprint 47 Done (or parallel after Story 01 view-models)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-ui` primary  
**Round:** 2 · **Extra agents:** 3.5 on all stories

---

## Goal

1. Split messaging hooks (socket lifecycle vs thread state vs list optimistic)
2. Thin fat clients (conversations, onboarding, admin content-violations)
3. Unify session-cookie / auth gate; mandate `useAppLocale`
4. Shared InlineError / RouteError; move match-display out of `app/`

---

## Stories

| # | Story | Extra | Status |
|---|-------|-------|--------|
| 01 | [Messaging hook split](./STORY_01_messaging_hook_split.md) | 3.5 | In progress (`feature/sprint-56-story-1`) |
| 02 | [Fat client thinning](./STORY_02_fat_client_thinning.md) | 3.5 | Planned |
| 03 | [Auth cookie + locale + error primitives](./STORY_03_auth_locale_errors.md) | 2.5, 3.5 | Planned |
| 04 | [Match display lib + admin RQ/specs](./STORY_04_match_lib_admin_rq.md) | 3.5 | Planned |
