# holy-grail-matching/

Deterministic matching stack **above** LLM extraction: map profile sources → canonical model → eligibility / decision / audit (+ optional post-filter rank). Nest: `HolyGrailMatchingModule`. Legacy `matches/` `match-engine` stays separate until cutover.

## Layout

| Path | Owns |
|------|------|
| *(root)* | Nest module, eligibility evaluator, dealbreaker helpers, structured write, ranking, `index.ts` public exports |
| `canonical-mapper/` | Layer 2 mapper slices → `MatchingCanonicalModel` (Sprint 72 split) |
| `decision/` | Pair decision / audit builders |
| `retrieval/` | Profile-source ports, Prisma adapter, wire DTOs |

**Canonical entry:** prefer `mapProfileSourceToMatchingCanonical` via root `profile-to-canonical.mapper.ts` (re-exports `canonical-mapper/`). Contract: `src/canonical/matching-canonical.types.ts`. Spec: repo [`docs/HOLY_GRAIL_MATCHING.md`](../../../docs/HOLY_GRAIL_MATCHING.md) (Step 4 / Layer 2–3).

## Dealbreaker / keyword freeze

Text classifiers under this module (`dealbreaker-*-text.extract.ts`, lifestyle / personality / interest tag extractors) are part of the **Sprint 52 keyword engine freeze**:

- Policy: [`KEYWORD_ENGINE_FREEZE.md`](../../docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md)
- Inventory: [`KEYWORD_INVENTORY.md`](../../docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md)

**No new regex / phrases / allowlist ids** without RFC in that doc. Bugfix restores + docs-only edits OK. Layer 3 SOFT_PASS policy is separately locked in `HOLY_GRAIL_MATCHING.md` § Locked Layer 3 — do not silently change `eligibility.evaluator.ts` rules.

## Where to add

- New mapper slice / validation: `canonical-mapper/` (keep root re-export stable).
- New hard eligibility dimension behavior: `eligibility.evaluator.ts` + audit types — expect Agent 4 / product lock if policy changes.
- New keyword patterns: **RFC first** (freeze), not a drive-by PR.
