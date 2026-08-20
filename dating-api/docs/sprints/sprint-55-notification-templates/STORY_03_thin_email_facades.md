# Story 03 — Thin per-type façades

**Sprint 55 · Done · P2 · ~1d**

**Status:** Done  
**Tip:** `feature/sprint-55-story-3` @ `e1a87c2` (impl `22c1b8a`)

Each type service becomes thin: build template → call shared send. No duplicated try/catch user-load.

## Definition of done

- [x] `email-templates.ts` used by all four type services
- [x] Services are orchestration façades; copy lives in builders
- [x] Mutual empty-email skip; Story 01–02 contracts preserved
- [x] Tests green; Agent 2 approved; sprint → 3/3
