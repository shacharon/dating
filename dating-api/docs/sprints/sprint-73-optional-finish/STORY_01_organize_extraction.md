# Story 01 — Organize extraction/

**Sprint:** 73  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Optional

**Handoffs:** [preflight](./handoffs/STORY_01_organize_extraction/agent--1-preflight.md) · [architect](./handoffs/STORY_01_organize_extraction/agent-0-architect.md) · [dev](./handoffs/STORY_01_organize_extraction/agent-1-dev.md) · [CR](./handoffs/STORY_01_organize_extraction/agent-2-cr.md) · [PM](./handoffs/STORY_01_organize_extraction/agent-3-pm.md)

---

## Objective

Reduce `src/extraction/` from ~55 flat files to feature folders (same pattern as Sprint 70).

---

## Target layout

```
extraction/
  README.md
  extraction.service.ts
  extraction-core.module.ts

  core/                    # service, runner, cleaner, normalization, usage, schemas
  prompt/                  # prompt.builder + specs
  expansion/               # expansion-*-signal-definitions, manifest, rollout specs
  shadow/                  # expansion-shadow* specs (if not next to expansion)
  pipeline/                # pipeline-snapshots, pipeline-trace, strict-validation
```

Architect may adjust; **root ≤15 files**, no folder >25 files.

---

## Tasks

1. Move files; update imports.
2. Write `extraction/README.md` (where to add Expansion-16).
3. `npm test -- extraction`.

---

## Success

- [ ] Root ≤15 files
- [ ] README present
- [ ] Tests green

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
