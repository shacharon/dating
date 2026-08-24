# Story 01 — Organize extraction/

**Sprint:** 73  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_01_organize_extraction/agent--1-preflight.md) · [architect](./handoffs/STORY_01_organize_extraction/agent-0-architect.md) · [dev](./handoffs/STORY_01_organize_extraction/agent-1-dev.md) · [CR](./handoffs/STORY_01_organize_extraction/agent-2-cr.md) · [PM](./handoffs/STORY_01_organize_extraction/agent-3-pm.md)

---

## Objective

Reduce `src/extraction/` from ~55 flat files to feature folders (same pattern as Sprint 70).

---

## Shipped layout

```text
extraction/
  README.md
  extraction.service.ts / extraction-core.module.ts
  extracted-*.interface.ts (+ specs)
  extraction-directory.wiring.spec.ts

  core/        (13) — runner, cleaner, normalization, usage, schemas, service specs
  prompt/      (2)
  expansion/   (24) — definitions, manifest, rollout
  shadow/      (4)
  pipeline/    (5) — strict-validation, snapshots, pipeline-trace
```

Root **9** files (≤15). Public Nest/DTO paths unchanged.

---

## Success

- [x] Root ≤15 files (**9**)
- [x] README present (Expansion-16 add path)
- [x] Tests green (Agent 2: **27** suites / **345** tests incl. dependents)

---

## Shipped

`feature/sprint-73-story-1` @ `bd84d05`

- `43d571b` — refactor: organize extraction/ into feature folders
- `bd84d05` — test: harden extraction directory wiring guards

**Shipped on main:** _(filled after merge)_  
**Feature tip ahead of main:** 0

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** Expansion / prompt / pipeline edits land in ≤24-file folders instead of a 55-file flat root.

---

## SOLID / KISS

- **SRP:** core ≠ prompt ≠ expansion ≠ shadow ≠ pipeline.
- **KISS:** Move-only; stable public imports; no barrels.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
