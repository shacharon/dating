# Story 01 — Expansion manifest + prompt wiring

**Sprint 51 · Planned · P1 · ~2d**

## Objective

Introduce `ExpansionManifest` (or equivalent) listing expansion modules. `extraction.service` iterates the registry instead of hardcoding EXPANSION_01…N imports into prompt strings.

## Acceptance criteria

- [ ] Adding a shadow expansion = new module + manifest entry (no prompt string edit in core service)
- [ ] Parity: existing expansions still extract
- [ ] Specs green
