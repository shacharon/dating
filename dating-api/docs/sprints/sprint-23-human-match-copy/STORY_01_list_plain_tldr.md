# Story 1: List — plain one-line TLDR (no chip names)

**Sprint:** 23  
**Status:** Done  
**Depends on:** —

---

## Why

“Your matches” still shows lines like *You share real overlap on Ambition alignment, Emotional depth, and …*  
That is chip jargon. The list’s only job is: **should I open this?** One plain line.

---

## What

**As a** user  
**I want** each match card to show one clear reason in normal English  
**So that** I can scan without reading product labels.

### Acceptance criteria

- [x] List subtitle / TLDR **never** contains known chip labels (e.g. `Ambition alignment`, `Emotional depth`, `Lifestyle pace`) as display text.
- [x] TLDR is **one short line** (roughly ≤ ~120 chars preferred; hard cap architect-set).
- [x] Built from existing structured facts — prefer trait **evidence** snippets or a fixed chip→plain map — **not** a full LLM call on list load.
- [x] Same match: list line and detail narrative can share themes, but list stays short.
- [x] UI list still does **not** render `matchNarrative` even if present on a payload.
- [x] Unit (+ UI if list copy source changes) tests: chip labels absent; empty-chips path still usable.
- [x] Scoring / ranking untouched.

### Out of scope

- Full LLM on list.
- Changing detail `matchNarrative` (Stories 2–3).
- i18n of the new line (English-first ok).
- Redesigning list card layout (photo / Liked / score stay).

---

## Definition of done

- [x] Local eyeball: toto-style card shows plain English, not chip names. *(unit + UI fixtures; optional operator refresh deferred)*
- [x] List API/UI path covered by tests for “no chip label substrings” on the displayed field.
- [x] Agent pipeline complete (Agent 4 skipped — DTO shape unchanged; not eligibility/ranking).

### Implementation notes (pipeline close)

- `CHIP_TO_TRAIT.listPhrase` + `buildPlainMatchListTldr` → `primaryTakeaway`; list UI prefers takeaway over `reasonShort`.
- Agent 2: Ambition phrase polish + truncate coverage.
- Leftover: `reasonShort` may still be jargon (Story 4 / unused on list when takeaway present).

## Suggested touchpoints

- `dating-api/src/matches/match-explainability.ts` (`reasonShort`) and/or `match-recommendation.ts` (`primaryTakeaway`)
- List DTO / `MeMatchesService` list mapping
- `dating-ui/src/app/dating/me-matches/page.tsx` (what field it renders)
- Optional: shared `chip → plain phrase` map next to `CHIP_TO_TRAIT`

## Agent pipeline

```text
--agent 0 sprint 23 story 1
--agent 1 sprint 23 story 1
--agent 2 sprint 23 story 1
--agent 3 sprint 23 story 1
```

Agent 4: only if architect flags matches list HTTP / harness impact.

