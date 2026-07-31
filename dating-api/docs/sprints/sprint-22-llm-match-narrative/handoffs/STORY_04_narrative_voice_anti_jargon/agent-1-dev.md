# Handoff: Agent 1 — Senior dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_narrative_voice_anti_jargon.md](../../STORY_04_narrative_voice_anti_jargon.md)  
**Sprint:** sprint-22-llm-match-narrative  
**Date:** 2026-07-30  
**Status:** complete  

---

## Summary

- Phase 2 voice fix only: lean LLM JSON (evidence / interests / tension — no chips or trait labels), shared ban list, validator grounds on evidence + interests only, fallback no longer lists chip labels, `MATCH_NARRATIVE_PROMPT_VERSION` → **`v2`**.
- No Prisma / Nest / UI / scoring / temperature knobs changes. Cache invalidates via existing `promptVersion` in the unique key.
- **Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `src/matches/match-narrative/match-narrative.types.ts` | `MATCH_NARRATIVE_PROMPT_VERSION = 'v2'` |
| `src/matches/match-narrative/match-narrative-voice.ts` | **created** — `BANNED_NARRATIVE_PHRASES`, `findBannedPhrase` / `containsBannedPhrase`, `tensionNoteFromChip` |
| `src/matches/match-narrative/match-narrative-prompt.ts` | hardened system prompt; `toLlmPromptFacts()`; lean user JSON |
| `src/matches/match-narrative/match-narrative-validate.ts` | ban check then evidence/interest grounding (no chip-label grounding) |
| `src/matches/match-narrative/match-narrative-fallback.ts` | removed “clearest shared signals are {chips}” branch |
| `src/matches/match-narrative/index.ts` | exports voice helpers + `toLlmPromptFacts` |
| `src/matches/match-narrative/*.spec.ts` | prompt lean / ban reject / fluff → fallback / v2 |
| `prisma/*` / `me-matches.service.ts` / UI | **unchanged** |

---

## Decisions (do not reverse without discussion)

- Shared bans live in `match-narrative-voice.ts` and are joined into the system prompt + used by the validator (single source of truth).
- `MatchNarrativeFactPack` still carries `positiveChips` / trait labels for fallback / internal use; only the **LLM user prompt** is lean.
- Tension: map known chips → plain English; if chip text hits bans / “alignment”, use generic “One area may need an early honest conversation.”
- Longer ban phrases (e.g. `ambition alignment`) are listed before shorter ones (`alignment`) so `findBannedPhrase` reports the more specific hit first.
- LLM knobs unchanged (`temperature: 0.4`, etc.).

---

## Runtime topology (architect — realtime / proxy / cookies only)

**N/A** for transport. After API restart: open a scored match detail → narrative must not contain “ambition alignment” / brochure fluff; second open should hit `v2` cache.

---

## Tests / verification

- [x] User prompt JSON has no `positiveChips` / trait `label` / `Ambition alignment`
- [x] Narrative with “solid foundation for a meaningful connection” → validate fail
- [x] Evidence-grounded text without banned phrases → ok
- [x] Mock LLM fluff → `source: 'fallback'`
- [x] `MATCH_NARRATIVE_PROMPT_VERSION === 'v2'`
- [x] `npx jest --testPathPatterns "match-narrative" --no-coverage` → **27/27 pass**
- [x] `npx jest --testPathPatterns "me-matches" --no-coverage` → **99/99 pass**
- [x] `npx tsc --noEmit -p tsconfig.json` → **pass** (pending if still running — confirm below)
- [x] `prisma migrate deploy`: **N/A**
- [x] Browser Network smoke: **deferred** (manual after deploy/restart)
- [x] Socket transport: **N/A**

---

## E2E verification (agent 4 — eligibility / preference / ranking stories only, else N/A)

**N/A — skip Agent 4.**

---

## Open questions / blockers

- None. Phase 3 still deferred.

---

## Next agent

```text
--agent 2 sprint 22 story 4
```

**Notes for next agent:**

- Confirm lean prompt, shared bans, evidence-only grounding, fallback scrub, `v2`.
- Confirm no Nest/UI/Prisma churn.
- After CR → `--agent 3 sprint 22 story 4` (skip 4).
