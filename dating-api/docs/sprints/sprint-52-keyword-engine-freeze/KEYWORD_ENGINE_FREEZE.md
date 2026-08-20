# Keyword engine freeze

**Status:** FROZEN as of Sprint 52 Story 02 (2026-08-20) · branch `feature/sprint-52-story-2`

Ownership map: [KEYWORD_INVENTORY.md](./KEYWORD_INVENTORY.md).  
Agent/PR policy prose: Story 03 will publish the long-form “where new signals go” guide on top of this freeze.

---

## Rule

**No new regex, phrase patterns, or allowlist ids** in the frozen files below without an **RFC exception** (template in this doc, cited from the PR).

Goal: stop additive keyword dumps. Collisions between engines stay as documented in the inventory until a future taxonomy story resolves them.

---

## Allowed without RFC

- Bugfixes that **restore** a previously intended match (include before/after fixture in the PR).
- Refactors that do **not** change match sets / allowlist membership.
- Comments, docs, and freeze/inventory banners.

---

## RFC exception template

Copy into the PR description (or append under an “Approved exceptions” section at the bottom of this file when lasting):

| Field | |
|-------|--|
| Problem | |
| Why not LLM expansion / structured profile field / Sprint 51 expansion playbook? | |
| Proposed patterns / allowlist ids | |
| Parity fixtures (spec names + cases) | |
| Rollback | |
| Approver | tech lead / Architect |

---

## Frozen file list

| Engine / surface | Path |
|------------------|------|
| `enrichment-v2` | `src/evaluate/enrichment-v2.ts` |
| `explicit-extended-lists` | `src/evaluate/explicit-extended-lists.ts` |
| `hg-dealbreaker-text` | `src/holy-grail-matching/dealbreaker-signals-text.extract.ts` |
| Dealbreaker taxonomy | `src/holy-grail-matching/dealbreaker-taxonomy.ts` |
| `hg-lifestyle-text` | `src/holy-grail-matching/lifestyle-signals-text.extract.ts` |
| `hg-interest-text` | `src/holy-grail-matching/interest-tags-text.extract.ts` |
| `hg-personality-text` | `src/holy-grail-matching/personality-traits-text.extract.ts` |

**Not frozen as regex dumps** (different growth path):

- `src/extraction/` — LLM signals / canonical interests via expansion playbook; **no** new regex fallbacks for interests.
- `enrichment-v3.ts` / `enrichment-v4.ts` — aliases only; freeze lives in `enrichment-v2.ts`.

---

## Parity gate

Characterization only — dumps must keep today’s outputs. From `dating-api`:

```bash
npx jest --no-coverage --forceExit --runInBand \
  src/evaluate/enrichment-v2.spec.ts \
  src/evaluate/enrichment-v2.phrases.spec.ts \
  src/evaluate/keyword-engine-freeze.parity.spec.ts \
  src/holy-grail-matching/dealbreaker-signals-text.extract.spec.ts \
  src/holy-grail-matching/lifestyle-signals-text.extract.spec.ts \
  src/holy-grail-matching/interest-tags-text.extract.spec.ts \
  src/holy-grail-matching/personality-traits-text.extract.spec.ts
```

Note: `explicit-extended-lists.ts` has **no** dedicated `*.spec.ts`; coverage is indirect via `evaluate.service.spec.ts`. Freeze banner + inventory still apply. Do not weaken extract/enrichment goldens without a proven pre-existing flake.

Thin banner check: `src/evaluate/keyword-engine-freeze.parity.spec.ts`.

---

## Taxonomy deferred

A single shared taxonomy table that generates classifiers is **out of scope** for Sprint 52 Story 02. Inventory collisions (interests 3+, lifestyle dual/triple, conflict dual representations) need an explicit follow-up epic before safe merge. Until then, **freeze** is the law; do not grow parallel dumps.

---

## Related

- [KEYWORD_INVENTORY.md](./KEYWORD_INVENTORY.md)
- Story 03 — no-new-regex agent/PR policy (planned)
- LLM expansion registration: Sprint 51 `docs/sprints/ADD_EXPANSION_PLAYBOOK.md` (when that branch is merged; until then use expansion manifest headers under `src/extraction/` / `src/matches/`)
