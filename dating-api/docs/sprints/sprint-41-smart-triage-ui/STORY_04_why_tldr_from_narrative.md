# Story 04 — Browse WHY TLDR from match narrative

**Sprint 41 · Status: Done**  
**Priority:** P0 (browse differentiator — replaces fake one-liner)  
**Estimated effort:** 2 days  
**Dependencies:** Sprint 22 narrative + cache (Done); Stories 01–02 browse UI (Done)  
**Repo:** Both `dating-api` + `dating-ui`  
**Risk:** Medium (LLM cost if eager; must not reintroduce template coach-copy)  
**Handoffs:** `handoffs/STORY_04_why_tldr_from_narrative/agent-*.md`  
**Architect:** [handoffs/STORY_04_why_tldr_from_narrative/agent-0-architect.md](./handoffs/STORY_04_why_tldr_from_narrative/agent-0-architect.md)  
**Dev:** [handoffs/STORY_04_why_tldr_from_narrative/agent-1-dev.md](./handoffs/STORY_04_why_tldr_from_narrative/agent-1-dev.md)  
**CR:** [handoffs/STORY_04_why_tldr_from_narrative/agent-2-cr.md](./handoffs/STORY_04_why_tldr_from_narrative/agent-2-cr.md)  
**PM:** [handoffs/STORY_04_why_tldr_from_narrative/agent-3-pm.md](./handoffs/STORY_04_why_tldr_from_narrative/agent-3-pm.md)

---

## Objective

Make the match **browse** one-liner a short TLDR of the **same WHY** shown on the match profile (`matchNarrative`) — one source of truth, two lengths. Kill hardcoded `primaryTakeaway` templates on the list card.

## Why

Browse currently shows invented coach lines (“There’s something here…”, “You’re both into cooking — ask about that”). Users correctly call that nonsense. The real differentiator is already on the profile: grounded LLM narrative. Browse should preview **that** story, not a parallel template brain.

**Product lock (agreed):**
- Photo + score triage the swipe.
- Browse line = **TLDR of profile WHY** (same narrative).
- Conversation openers (“what to say”) = Sprint 42 — out of scope here.
- Chip / “token” copy polish = later — out of scope here.

---

## Current State

| Surface | Content today |
|---------|----------------|
| Match **detail** | `matchNarrative` (LLM, lazy on first open, cached in `MatchNarrativeCache`) |
| Match **list / browse** | `recommendation.primaryTakeaway` from `buildPlainMatchListTldr` — **hardcoded templates** |
| Expandable “Why” on card | Reuses takeaway / chips — not the narrative |

List **never** receives `matchNarrative` (by design in Sprint 22 — cost).

---

## Target State

### User experience

```
┌─────────────────────────────────┐
│      [LARGE PHOTO]     95%      │
│  Name, age                      │
│  City                           │
├─────────────────────────────────┤
│  <1–2 sentence WHY TLDR>        │  ← same story as profile, short
│  [Why ▾]  [Like] [Pass]         │
└─────────────────────────────────┘
```

Open profile → **full** `matchNarrative` (unchanged).  
Browse line must feel like a cut of that text, not a different author.

### Rules (locked)

1. **One source of truth:** TLDR is derived from / generated with `matchNarrative`, never from score-band template strings.
2. **No coach templates:** Ban decide-band lines (“say hello”, “worth a closer look”, “thin fit…”, “easy first message”, etc.) on browse.
3. **Empty is OK:** If no narrative/TLDR exists yet, **omit** the browse one-liner (photo + score still work). Do not invent filler.
4. **Detail unchanged:** Full narrative path, cache key, evaluation invalidation stay as Sprint 22.
5. **Openers deferred:** Sprint 42 owns “Try saying…”.

---

## Technical approach (preferred)

### A. Persist `narrativeTldr` with the narrative (recommended)

When narrative is generated (or on cache hit upgrade):

1. Produce a short TLDR (1–2 sentences, ≤ ~120–160 chars) from the same fact pack / same LLM call (or a deterministic first-sentence extract of a validated narrative — Architect picks one).
2. Store on `MatchNarrativeCache` (new column `narrativeTldr Text or equivalent).
3. List DTO: expose `whyTldr` (or reuse `primaryTakeaway` **only** if it is set from this field — document the semantic change).
4. Browse UI: render `whyTldr` / new field; if blank → hide one-liner.

### B. Cost / when to generate

| Option | Behavior |
|--------|----------|
| **B1 — Lazy + cache (minimum)** | TLDR appears on list only after user (or system) has generated narrative once. First list paint may have no line. |
| **B2 — HIGH eager (preferred product)** | On list hydrate for **HIGH** tier only, ensure narrative+TLDR exist (cache miss → generate). GOOD/OTHER stay lazy/empty until opened. |

**Default lock for Agent 0:** **B2** unless cost review rejects it — then fall back to B1.

### C. Kill list template path

- Stop using `buildPlainMatchListTldr` decide/interest/place coach templates for browse `primaryTakeaway`.
- Keep module only if still needed for non-browse fallbacks; otherwise deprecate list usage and update specs.
- Expandable Why section: prefer `whyTldr` / narrative snippet over template takeaway; chips remain secondary.

---

## Scope / Tasks

### Agent 0 (Architect)
1. Lock TLDR generation: same LLM call vs second call vs first-sentence extract of validated narrative.
2. Lock DTO field name + list vs detail contract.
3. Lock B1 vs B2 (eager HIGH).
4. Schema change for `MatchNarrativeCache` (if any) + migration plan.
5. Prompt/version bump rules if TLDR is LLM-produced with narrative.
6. Acceptance criteria + out-of-scope (openers, chip redesign).

### Agent 1 (Senior Dev)
1. Backend: generate + persist TLDR with narrative; serve on list DTO.
2. HIGH eager path (if B2) — bounded, cached, no score/ranker changes.
3. Remove browse dependency on hardcoded `buildPlainMatchListTldr` templates.
4. Frontend: browse one-liner = WHY TLDR only; omit when empty.
5. Specs: list DTO, cache, UI empty/present; update recommendation/tldr specs that asserted coach strings.
6. Local smoke: open HIGH match → full why; back to list → same story short form.

### Agent 2 (Code Review)
1. Confirm no template coach-copy on browse path.
2. Confirm list does not N+1 LLM for all tiers (HIGH-only if B2).
3. Cache key / eval invalidation still correct.
4. UI: empty state clean; detail still full narrative.

### Agent 3 (PM)
1. Verify story DoD checklist.
2. Operator smoke on qa50 / real login pool.
3. Confirm Sprint 42 still owns openers (no scope bleed).

---

## Out of scope

- Conversation openers / pre-fill (Sprint 42)
- Redesigning chip / “token” language on detail
- Changing match scores, tiers, or HG eligibility
- Generating full narrative for every OTHER match on every list load
- Hebrew/i18n narrative (English-first, same as Sprint 22)

---

## Definition of done

- [x] Browse one-liner, when present, is a short form of the profile WHY (`matchNarrative` / stored TLDR) — same story.
- [x] No hardcoded score-band / coach template lines on browse.
- [x] Missing TLDR → no one-liner (not filler).
- [x] Detail still shows full narrative; cache behavior preserved.
- [x] HIGH path (if B2) does not explode LLM cost for full list.
- [x] Unit + UI specs updated; local smoke documented in handoff.
- [x] Sprint 42 openers unchanged / not started here.

---

## Success check (human)

Open a HIGH match, read the profile WHY. Go back to the list. The short line should feel like **the first beat of that same text**, not a different product voice.
