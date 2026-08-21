# Add-expansion playbook

**Sprint 51 · OCP registration path**

How to add Expansion-N by registering modules — not by pasting into core services.

---

## Purpose

Register a new expansion without editing core paste sites (`extraction.service` prompt splices, `match-explainability` if-ladders, or `assemble-result` spreads). Use the paired manifests as the only registration points.

---

## Paired registries (SoT)

| Concern | Path |
|---------|------|
| Prompts (self / partner / interest blocks) | `src/extraction/expansion-manifest.ts` |
| Chips / shadow breakdown builders | `src/matches/expansion-explainability-manifest.ts` |

Use the **same** `id` string in both (e.g. `expansion-16`). Do **not** put explainability hooks into the extraction prompt manifest (keeps layering clean).

**Today’s membership (do not invent a merge):**

- Prompt manifest: expansions **01–15** (includes **08** and **09**).
- Explainability manifest: **01–07, 10–15** only (no **08** / **09** explainability modules today).

**Special case:** `pickInterestOverlapTags` stays a direct Expansion-07 import in `match-explainability.ts` — it is **not** registered via the generic chip-key helpers.

---

## Choose your shape

1. **Shadow signals (typical)** — definition module + prompt-manifest entry; optionally explainability module + explainability-manifest entry when product chips / shadow breakdown exist.
2. **Interest guidance (09 pattern)** — interest guidance block on the prompt manifest only; usually **no** explainability entry (09 today).
3. **Prompt-only (08 pattern)** — prompt-manifest entry without explainability until chips/breakdown are ready.

---

## Files checklist

### Always (shadow or interest module)

- [ ] `src/extraction/expansion-NN-signal-definitions.ts` (or interest module for 09-like work)
- [ ] One entry on `EXPANSION_PROMPT_MANIFEST` (append in numeric / id order)
- [ ] Thin unit or rollout spec if that expansion family already uses one — **mirror the nearest sibling**; do not invent a new mega-suite

### If product chips / shadow breakdown

- [ ] `src/matches/expansion-NN-explainability.ts`
- [ ] One entry on `EXPANSION_EXPLAINABILITY_MANIFEST` (same `id`; keep order consistent with 01–07, 10–15)
- [ ] Explainability unit spec mirroring a sibling

### Never edit for registration

- [ ] ~~`extraction.service.ts` prompt splices~~ — use join helpers from the prompt manifest
- [ ] ~~`match-explainability.ts` per-expansion if-ladders~~ — use registry helpers
- [ ] ~~`compare-stages/assemble-result.ts` per-expansion spreads~~ — use `buildAllExpansionShadowBreakdowns`

---

## Verification

From `dating-api`:

```bash
# Prompt registry
npx jest --no-coverage --forceExit --runInBand \
  src/extraction/expansion-manifest.spec.ts

# If chips registered
npx jest --no-coverage --forceExit --runInBand \
  src/matches/expansion-explainability-manifest.spec.ts \
  src/matches/expansion-NN-explainability.spec.ts
```

Also keep sibling / extraction characterization green when you change prompt blocks.

---

## Soft &lt;30 min target

**<30 minutes** is a target for **registration plumbing** when copying an existing sibling pattern (new module file(s) + manifest entry/entries + sibling-style specs).

It does **not** include inventing new signal semantics, chip copy, scoring, or LLM prompt craft from scratch.

---

## Out of scope (unless another sprint owns it)

- Scoring weights / pair-score math
- Zod allowlists / extraction schema keys
- Eligibility / ranking / Holy Grail
- UI chip rendering contracts

---

## Related

- Sprint: [sprint-51-expansion-registry](./sprint-51-expansion-registry/README.md)
- Prompt SoT: `src/extraction/expansion-manifest.ts`
- Explainability SoT: `src/matches/expansion-explainability-manifest.ts`
