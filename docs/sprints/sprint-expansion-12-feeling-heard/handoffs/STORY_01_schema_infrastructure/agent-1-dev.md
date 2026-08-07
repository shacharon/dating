# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-12-feeling-heard  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Added `listeningPresence`, `emotionalExpression` to `SHADOW_SIGNAL_KEYS` (**28 → 30**).
- Bumped `MAX_EVIDENCE_ITEMS` **47 → 49**.
- Created metadata-only `expansion-12-signal-definitions.ts` (weights/tiers/domains/chips).
- Specs assert membership, counts, not scored, meta module; `DOMAIN_ALLOWED` deferred to Story 2.
- Bumped Exp-10/11 rollout gate global counts (28/43/47 → 30/45/49) so prior gates stay green.
- **No** prompts, scoring, tension, or i18n changes.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | 2 shadow keys; `MAX_EVIDENCE_ITEMS` 49 |
| `dating-api/src/extraction/expansion-12-signal-definitions.ts` | **Created** — metadata only |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Counts + Exp-12 shadow-mode block |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | Global count bump only |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | Global count bump only |

---

## Counts After Story 1

| Metric | Value |
|--------|-------|
| Shadow keys | **30** |
| Total extraction | **45** |
| `MAX_EVIDENCE_ITEMS` | **49** |
| Compatibility scored | **15** (unchanged) |
| Self `DOMAIN_ALLOWED` | still **35** (Story 2) |
| Partner `DOMAIN_ALLOWED` | still **21** (Story 2) |

---

## Tests / verification

- [x] `npx jest src/extraction/extracted-signals.spec.ts src/extraction/expansion-11-rollout.spec.ts src/extraction/expansion-10-rollout.spec.ts --runInBand` → **70/70** passed
- [x] `npm run typecheck` → exit 0
- [x] Browser Network smoke: N/A

---

## Explicit Non-Goals (this story)

- No LLM prompt / `DOMAIN_ALLOWED` sync (Story 2)
- No tension rules (Story 3)
- No chips / i18n / onboarding copy (Story 4)
- No promote to scoring
- No `Feels heard` / `Expressiveness match` chip invent (Story 4)

---

## Next agent

```text
--agent 2 expansion 12 story 1
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks. Adjacent assert uses `empathyCompassion` as **shadow** (Exp-01), not official — architect table called it scored/Exp-01 loosely.

Suggested commit:

```
feat(extraction): add Expansion-12 listeningPresence and emotionalExpression shadow keys

Story 1 — shadow allowlist 28→30; metadata module; no scoring wire-up.
```
