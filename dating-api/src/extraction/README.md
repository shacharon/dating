# Extraction

LLM signal extraction for profile text (self / relationship / partner). No DB persistence — Nest wires `ExtractionCoreModule` → `ExtractionService`.

## Folder map

| Path | Owns |
|------|------|
| *(root)* | Nest facade + public DTOs (`extraction.service`, `extraction-core.module`, `extracted-*.interface`) |
| `core/` | LLM runner, normalization, cleaner, usage, schemas, service specs |
| `prompt/` | System prompt builder |
| `expansion/` | Expansion 01–15 signal definitions, interest guidance, manifest, rollout specs |
| `shadow/` | Expansion shadow characterization specs |
| `pipeline/` | Strict validation, pipeline snapshots, pipeline trace |

## Add Expansion-16

Do **not** paste new expansions into `extraction.service.ts`.

1. Add `expansion/expansion-16-signal-definitions.ts` (or interest-guidance pattern like 09).
2. Append one entry on `expansion/expansion-manifest.ts` (numeric / id order).
3. If product chips / shadow breakdown exist, register the same `id` in `matches/explainability/core/expansion-explainability-manifest.ts`.
4. Mirror the nearest rollout / shadow spec pattern under `expansion/` or `shadow/`.
5. Full checklist: [`docs/sprints/ADD_EXPANSION_PLAYBOOK.md`](../../docs/sprints/ADD_EXPANSION_PLAYBOOK.md).

**Headroom:** `expansion/` is at 24 files (cap 25). A 16th definitions file alone is OK; if you also need a new rollout sibling that would exceed 25, split `expansion/` into `definitions/` + `rollout/` first.
