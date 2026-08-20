# Story 02 — Wire PROCESS_* handlers

**Sprint 54 · Done · P1 · ~0.5d · Agent 2.5**

**Status:** Done  
**Tip:** `feature/sprint-54-story-2` @ `96d9601`

Wire `PROCESS_UNCAUGHT_EXCEPTION` / `PROCESS_UNHANDLED_REJECTION` to process listeners + obs/Sentry (codes already defined).

## Definition of done

- [x] `registerProcessErrorHandlers` called from `main.ts` after DI, before `listen`
- [x] `uncaughtException` → PROCESS_* fatal + Sentry + `process.exit(1)`
- [x] `unhandledRejection` → PROCESS_* fatal + Sentry, no exit
- [x] Idempotent register; handlers wrapped try/catch
- [x] Unit tests green; Agents 2 + 2.5 approved
- [x] Agent 5 optional post-deploy only (not a Done gate)
- [x] PROCESS_* codes retained for Story 03
