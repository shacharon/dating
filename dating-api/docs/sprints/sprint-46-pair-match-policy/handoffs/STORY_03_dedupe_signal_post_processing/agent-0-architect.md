# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_dedupe_signal_post_processing.md](../../STORY_03_dedupe_signal_post_processing.md)  
**Sprint:** sprint-46-pair-match-policy  
**Date:** 2026-08-08  
**Status:** complete  

**Mode:** Delete **both** dead twin trees (`engine/signal-post-processing/*` and matching `extraction/extraction-{sparse,text,signal-count,confidence}*`). Live post-LLM ownership stays in **`extraction`** (`extraction-normalization` + `extraction-strict-validation`). **Zero** intentional score / eligibility change. **Agent 4: Skip.**

**Depends on:** Stories 01–02 preferred for call-site stability — **not required**. This story does not touch PairMatchPolicy, admin compare, or me-matches. May proceed while 01/02 DoD remain Blocked on materialized e2e.

---

## Summary

- Twin trees are **byte-identical** (import path only) and **unwired** from `ExtractionService.extract()` (LLM-first refactor).
- Live path: normalize + strict-validate only — **no** engine twin for alias/normalize.
- Canonical owner for *live* post-LLM: **`extraction`**. Do **not** promote `engine/signal-post-processing` as shared home.
- Delete both dead trees; prefer **hard delete** over re-exports (zero external callers today).
- If parity / “no post-process” specs fail after delete → **stop** (unexpected import or accidental rewire).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Live post-LLM | `extraction-normalization.ts` (`KEY_ALIASES`, interest tags) + `extraction-strict-validation.ts` |
| Live entry | `ExtractionService` ← `EvaluateService` |
| Dead twin A | `src/engine/signal-post-processing/` — 6 files; imports types from `extraction/` (inverted dep) |
| Dead twin B | `extraction-text-stats`, `extraction-confidence`, `extraction-sparse-policy`, `extraction-signal-count-policy`, `extraction-text-inference`, `extraction-sparse-profile-patch` |
| Dead pipeline (removed from `extract()`) | `applySparseTextGuard` → `applyTextInference` → `enforceSignalCountLimits` → `applySparseProfileNullOnlyPatch` |
| Not twins | `matches/coverage-policy.ts` match-time `SPARSE_*` / confidence — **do not touch** |
| Matching / admin | Zero imports of either dead tree |

---

## Artifacts (locked)

### Delete (dead twins)

```text
dating-api/src/engine/signal-post-processing/
  text-stats.ts
  confidence.ts
  sparse-policy.ts
  signal-count-policy.ts
  text-inference.ts
  sparse-profile-patch.ts
  # remove empty folder after delete

dating-api/src/extraction/
  extraction-text-stats.ts
  extraction-confidence.ts
  extraction-sparse-policy.ts
  extraction-signal-count-policy.ts
  extraction-text-inference.ts
  extraction-sparse-profile-patch.ts
```

### Keep (live — do not relocate)

| Path | Role |
|------|------|
| `extraction-normalization.ts` (+ interest spec) | Parse / alias / interests |
| `extraction-strict-validation.ts` (+ spec) | Domain allowlist / evidence |
| `extraction.service.ts` (+ spec) | Orchestration — must stay free of deleted stages |
| `extraction-pipeline-snapshots.ts` (+ spec) | Offline mirror of **live** post-LLM steps |
| `extracted-signals.interface` / related specs | Types + `KEY_ALIASES` checks |

### Optional doc hygiene (non-blocking for Done)

| Path | Note |
|------|------|
| Stale pipeline maps citing engine post-processing as live | Fix or leave with “dead / deleted” note — do not restore stages |
| Sprint 21 docs referencing both twin paths for SIGNAL_COUNT | Historical; no code restore |

| Path | Change |
|------|--------|
| Prisma / HTTP / PairMatchPolicy / me-matches / matches | **N/A** |
| New shared module under `engine/` | **Forbidden** this story |

---

## Decisions (do not reverse without discussion)

### 1. Canonical owner (locked)

**`extraction`** owns live post-LLM coercion (normalize + strict-validate).

**Do not** make `engine/signal-post-processing` the shared module — call-site gravity is extraction-only; engine tree already depends on extraction types (inverted).

### 2. Dedup strategy (locked)

| Option | Verdict |
|--------|---------|
| Keep one live twin tree under extraction | **No** — dead code must not return |
| Thin re-export from one tree | **No** unless Agent 1 discovers an external import mid-PR |
| Hard delete both trees | **Yes** |

Story AC “one module owns post-processing” = live `extraction` normalize/validate ownership + **no** dual dead copies. Not “re-home dead sparse/inference into a shared package.”

### 3. Must not re-wire (locked)

Do **not** re-add to `extract()`:

- `applySparseTextGuard`
- `applyTextInference`
- `enforceSignalCountLimits`
- `applySparseProfileNullOnlyPatch`

Specs already assert no sparse guard / no policy caps / LLM confidence preserved. Restoring those stages **would** change scores — stop-ship if someone “fixes” by rewiring.

### 4. Parity / proof (locked)

Before delete:

1. `git diff --no-index` (or content hash) each twin pair — expect import-path-only drift.
2. `rg` prove zero imports of deleted symbols outside the two trees.

After delete:

```bash
cd dating-api
npx tsc --noEmit
npx jest --no-coverage --testPathPattern="extraction" --runInBand
```

Minimum green: `extraction.service.spec`, `extraction-normalization*`, `extraction-strict-validation*`, `extraction-pipeline-snapshots*`, `extracted-signals*` (as applicable).

Document in Agent 1 handoff: twin hash/diff result + import `rg` proof + jest summary.

### 5. Out of scope

| Do not |
|--------|
| New signals / expansions |
| UI |
| PairMatchPolicy / admin compare / me-matches |
| Touch `matches/coverage-policy.ts` sparse caps |
| Revive hardcoded `SPARSE_PATCH_PROFILE_IDS` |

### 6. Schema / HTTP

- Prisma: **N/A**
- API contracts: **unchanged** (no endpoints)

---

## HTTP contracts (unchanged)

- N/A — no REST/socket change

---

## Runtime topology

- N/A

---

## E2E verification plan (Agent 4)

**Skip.** Deleting unused modules cannot change extracted signals, HG gate, or ranking **unless** dead stages are rewired into `extract()` (forbidden).

| Item | Plan |
|------|------|
| Affects eligibility / ranking? | **No** if delete-only |
| Agent 4 | **Skip** → after CR: `--agent 3 sprint 46 story 3` |
| If Agent 1 accidentally rewires dead stages | Stop → treat as scoring change; escalate Architect before Agent 4 |

---

## Agent 1 instructions

1. Confirm twin pairs identical aside from imports; confirm zero external callers via `rg`.
2. Delete both dead trees (12 files + empty `signal-post-processing` dir).
3. Do **not** re-export; do **not** change `extraction.service.ts` pipeline stages.
4. Run locked `tsc` + extraction Jest; document parity/`rg` in `agent-1-dev.md`.
5. Optional: one-line doc note on any stale pipeline map you already open — not required for AC.
6. Commit; hand off to Agent 2.

Suggested commit:

```
refactor(signals): dedupe engine vs extraction post-processing

Sprint 46 Story 3
```

---

## Agent 2 instructions

- [ ] Both dead trees gone; no thin re-exports unless justified  
- [ ] Live normalize/validate unchanged; no rewire of sparse/inference/count/patch  
- [ ] Extraction specs green; parity/`rg` noted  
- [ ] **Skip Agent 4** → `--agent 3 sprint 46 story 3`

---

## Open questions / blockers

- None for design. Stories 01/02 Blocked on materialized e2e is orthogonal.

---

## Next agent

```text
--agent 1 sprint 46 story 3
```

**Notes for next agent:**

- Hard-delete archaeology; do not re-home dead policies under engine.
- Agent 4 skipped unless you rewire (don’t).
