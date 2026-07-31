# Handoff: Agent 1 — Senior dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_denser_match_narrative.md](../../STORY_01_denser_match_narrative.md)  
**Sprint:** sprint-24-denser-match-narrative  
**Date:** 2026-07-31  
**Status:** complete  

---

## Summary

- Denser detail why: `MATCH_NARRATIVE_PROMPT_VERSION = 'v5'`; prompt targets **4–5** sentences / ~80–120 words with anti-pad shape; validator max **6** sentences + **140** words; fallback evidence **≤2**.
- Specs updated for overlong reject, dense pass, fallback trim. **Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `match-narrative.types.ts` | `v5` |
| `match-narrative-prompt.ts` | denser system + user density line |
| `match-narrative-validate.ts` | `NARRATIVE_*` caps; word count |
| `match-narrative-fallback.ts` | `traits.slice(0, 2)` |
| `index.ts` | export density constants |
| Specs | prompt / validate / generator / fallback |

---

## Decisions (do not reverse without discussion)

- Left `maxTokens: 900` unchanged.
- No new ban phrases this story.

---

## Runtime topology

**N/A.** After API restart: detail open → `v5` miss → denser regenerate.

---

## Tests / verification

- [x] `npx jest --testPathPatterns "match-narrative" --no-coverage` → **51/51**
- [x] `prisma migrate deploy`: **N/A**
- [x] Browser smoke: **deferred**
- [x] Socket: **N/A**

---

## E2E verification (agent 4)

**N/A — skip Agent 4.**

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 24 story 1
```

**Notes for next agent:**

- Confirm v5, max 6 / 140, fallback ≤2 evidence, no list/scoring regression.
- After CR → `--agent 3 sprint 24 story 1` (skip 4).
