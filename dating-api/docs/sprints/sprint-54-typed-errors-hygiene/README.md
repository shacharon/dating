# Sprint 54 — Typed Errors + ErrorCodes Hygiene (P1)

**Status:** In progress (1/3) · **Depends on:** Sprint 45 Story 02 pattern · **Round:** 2  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

## Goal

Extend `MeMatchesDomainError` pattern; wire PROCESS_UNCAUGHT_*; use or remove dead ErrorCodes (`ADMIN_FORBIDDEN`, `ME_PROFILE_UNAUTHORIZED`, etc.).

## Stories

| # | Story | Extra | Status |
|---|-------|-------|--------|
| 01 | [Extend domain errors to conversations/profile](./STORY_01_extend_domain_errors.md) | — | **Done** (`35d42e9`) |
| 02 | [Wire PROCESS_* handlers](./STORY_02_process_handlers.md) | 2.5 | Planned |
| 03 | [ErrorCodes audit use-or-remove](./STORY_03_errorcodes_audit.md) | — | Planned |
