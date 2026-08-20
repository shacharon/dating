# Story 02 — Quarantine legacy HTTP

**Sprint 53 · Done · P2 · ~1d**

**Status:** Done  
**Tip:** `feature/sprint-53-story-2` @ `d07dc27`

Mark `/api/evaluate`, `/api/matches` LegacyBackend paths as lab-only or schedule deletion. No silent dual product paths.

## Definition of done

- [x] Quarantine banners + `@deprecated` on evaluate + matches-api controllers; adapter banner
- [x] `LEGACY_HTTP_QUARANTINE.md` exists with lab-only + deletion schedule (delete **not** done here)
- [x] Allowlist annotates those two paths as lab-only / quarantined
- [x] Guards unchanged; no env 410 gate; no UI product callers
- [x] Typecheck green; Agent 2 confirms
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
