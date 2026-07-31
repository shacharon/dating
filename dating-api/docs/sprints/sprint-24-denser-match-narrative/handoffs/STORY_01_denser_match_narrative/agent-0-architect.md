# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_denser_match_narrative.md](../../STORY_01_denser_match_narrative.md)  
**Sprint:** sprint-24-denser-match-narrative  
**Date:** 2026-07-31  
**Status:** complete  

---

## Summary

- Tighten match **detail** narrative density only: prompt targets **4–5** sentences (~80–120 words); validator hard-caps length; bump `MATCH_NARRATIVE_PROMPT_VERSION` → **`v5`**.
- Trim structured **fallback** so it usually stays inside the same density band (fewer evidence lines).
- Keep v3+ bans, Phase 3 excerpts, list TLDR, scoring. **Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `match-narrative.types.ts` | design — `MATCH_NARRATIVE_PROMPT_VERSION = 'v5'` |
| `match-narrative-prompt.ts` | design — denser length + shape rules (replace 5–12) |
| `match-narrative-validate.ts` | design — max sentences **6**; soft word ceiling **140** |
| `match-narrative-fallback.ts` | design — ≤2 evidence sentences (was 5) |
| Specs (prompt / validate / generator / fallback) | design — Agent 1/2 |
| List TLDR / redact / Nest DTO / UI / Prisma | **no change** |

---

## Decisions (do not reverse without discussion)

### 1. Version bump

```ts
export const MATCH_NARRATIVE_PROMPT_VERSION = 'v5' as const;
```

- Cache key shape unchanged; `v4` rows unused after deploy. No migration.

### 2. System prompt length (locked)

Replace the current `Write 5–12 complete English sentences…` line with substance equivalent to:

- Write **4–5** complete English sentences (never pad to fill space). Prefer about **80–120 words**.
- Shape: (1) one opener with the main overlap, (2) one–two specific beats from evidence / interests / **at most 1–2 short** `profileExcerpts` echoes, (3) one concrete closer (ask or watch).
- Do **not** add soft personality filler without a listed fact (e.g. vague “stable and meaningful,” “grounded and curious” with no cue).
- If `tensionNote` is present, fold it into **at most one** sentence (not 1–2).
- Keep all existing Phase 3 / ban / JSON rules.

User prompt unchanged aside from optional one-liner: “Keep it dense — 4–5 sentences.”

### 3. Validator length (locked)

Order unchanged; only tighten length band after empty:

| Check | Rule | Fail reason |
|-------|------|-------------|
| Min sentences | `< 3` | `too_few_sentences:N` (unchanged) |
| Max sentences | `> 6` | `too_many_sentences:N` (**was 16**) |
| Max words | `> 140` | `too_many_words:N` (**new**) |

Word count: split on whitespace after trim; count non-empty tokens. Soft product target is 80–120; **140** is the hard reject (avoids cutting dense 5-sentence prose).

Do **not** add new brochure bans this story unless Agent 1 cannot get green without them — density + anti-pad prompt first.

Export constants for tests (preferred):

```ts
export const NARRATIVE_MIN_SENTENCES = 3;
export const NARRATIVE_MAX_SENTENCES = 6;
export const NARRATIVE_MAX_WORDS = 140;
```

### 4. Fallback trim (locked)

`buildFallbackMatchNarrative` still ignores `profileExcerpts` / chip labels.

Change:

```ts
const traits = factPack.traits.slice(0, 2); // was 5
```

Keep: opener → evidence (≤2) → thin-pack line if 0 traits → interest → tension → caution → next/closer.

Rationale: opener + 5 evidence + extras routinely exceeded the new product bar; fallback is not validated by `validateLlmNarrative`, but should still *feel* dense.

Do not rewrite openers/closers unless a ban hits (unlikely this story).

### 5. Generator knobs

Leave `temperature` / `maxTokens` unchanged by default (`maxTokens: 900`). Optional Agent 1 note only if overlong still dominates after prompt+validator — CR may lower `maxTokens` to ~500 (not required).

### 6. Untouched

- List TLDR / `primaryTakeaway` / UI reasonShort lock (Sprint 23.4).
- Phase 3 redaction caps / excerpt selection.
- Scoring / HG / Nest HTTP shape.
- Ban list expansion (unless blocked).

---

## API contract

**No new fields.** Detail `matchNarrative` string shorter after `v5` miss/regenerate.

---

## Service signatures

```ts
MATCH_NARRATIVE_PROMPT_VERSION = 'v5'

NARRATIVE_MIN_SENTENCES = 3
NARRATIVE_MAX_SENTENCES = 6
NARRATIVE_MAX_WORDS = 140

buildMatchNarrativeSystemPrompt(): string  // denser length + shape
validateLlmNarrative(...): …              // max 6 sentences; >140 words fail
buildFallbackMatchNarrative(...): …       // ≤2 evidence lines
```

---

## Migration plan

**N/A.** Rollback = revert to `v4` + old 5–12 / max-16 rules.

---

## Integration points

| Component | Action |
|-----------|--------|
| types | `v5` |
| prompt | Replace 5–12 with 4–5 / shape / anti-pad |
| validate | max 6 + word ceiling 140 |
| fallback | `traits.slice(0, 2)` |
| Specs | overlong fail; dense pass; v5 asserts |

---

## Runtime topology

**N/A.** First detail open after deploy → `v5` cache miss → regenerate denser copy.

---

## E2E verification (agent 4)

**Skip Agent 4** — narrative string content / version only.

---

## Tests / verification (plan for Agent 1–2)

- [ ] `MATCH_NARRATIVE_PROMPT_VERSION === 'v5'`
- [ ] System prompt matches `/4–5|4-5/` (or explicit denser wording); no `5–12` / `5-12`
- [ ] 7+ sentence grounded prose → `too_many_sentences`
- [ ] >140 words (even ≤6 sentences) → `too_many_words`
- [ ] 4–5 sentence evidence- or excerpt-grounded prose → ok
- [ ] Existing fluff / ungrounded / Phase 3 invent fixtures still fail
- [ ] Fallback with ≥3 chips uses ≤2 evidence sentences; still no chip labels / no about\* dump
- [ ] Generator fluff → fallback; `promptVersion` v5 in results
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser smoke: deferred optional
- [ ] Socket: N/A

---

## Open questions / blockers

- None for Agent 1.

---

## Next agent

```text
--agent 1 sprint 24 story 1
```

**Notes for next agent:**

- Implement `v5` + prompt + validate caps + fallback `slice(0, 2)`; update specs that assumed max 16 / 5–12 / `v4`.
- After CR → `--agent 3 sprint 24 story 1` (skip 4).
