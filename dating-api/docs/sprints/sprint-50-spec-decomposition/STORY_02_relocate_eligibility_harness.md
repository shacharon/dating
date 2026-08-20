# Story 02 — Relocate eligibility harness

**Sprint 50 · Planned · P0 · ~1d · Depends: Story 01 preferred**

## Objective

Move `me-matches-eligibility-harness.ts` (~1.2k LOC) out of production `src/` tree into test support (Architect locks path). Update imports; ensure Agent 4 / e2e paths still resolve.

## Acceptance criteria

- [ ] Harness not imported by production runtime modules
- [ ] E2E / eligibility stories still runnable
