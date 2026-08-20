# Sprint 54 — Typed Errors + ErrorCodes Hygiene (P1)

**Status:** Planned · **Depends on:** Sprint 45 Story 02 pattern · **Round:** 2  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

## Goal

Extend `MeMatchesDomainError` pattern; wire PROCESS_UNCAUGHT_*; use or remove dead ErrorCodes (`ADMIN_FORBIDDEN`, `ME_PROFILE_UNAUTHORIZED`, etc.).

## Stories

| # | Story | Extra |
|---|-------|-------|
| 01 | [Extend domain errors to conversations/profile](./STORY_01_extend_domain_errors.md) | — |
| 02 | [Wire PROCESS_* handlers](./STORY_02_process_handlers.md) | 2.5 |
| 03 | [ErrorCodes audit use-or-remove](./STORY_03_errorcodes_audit.md) | — |
