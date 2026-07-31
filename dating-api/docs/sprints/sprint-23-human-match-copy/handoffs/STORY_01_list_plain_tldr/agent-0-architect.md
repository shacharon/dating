# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_list_plain_tldr.md](../../STORY_01_list_plain_tldr.md)  
**Sprint:** sprint-23-human-match-copy  
**Date:** 2026-07-31  
**Status:** complete  

---

## Summary

- Fix **list** copy only: deterministic plain one-liner — **no LLM**, no chip labels on the card.
- New builder `buildPlainMatchListTldr` + short `listPhrase` per chip; rewrite `buildPrimaryTakeaway` to use it; **UI list** renders `recommendation.primaryTakeaway` instead of `explainability.reasonShort`.
- Leave `buildReasonShort` / chip jargon alone this story (detail uses `matchNarrative`; Story 4 may scrub leftovers).
- No Prisma / scoring / detail narrative changes. **Skip Agent 4** (DTO shape unchanged; not eligibility/ranking).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-explanation-traits.ts` (or sibling) | design — add `listPhrase` per known chip |
| `dating-api/src/matches/match-list-tldr.ts` (new) | design — `buildPlainMatchListTldr(...)` |
| `dating-api/src/matches/match-recommendation.ts` | design — `buildPrimaryTakeaway` → plain TLDR |
| `dating-api/src/matches/match-recommendation.spec.ts` | design — Agent 1/2 |
| `dating-api/src/matches/match-list-tldr.spec.ts` | design — Agent 1/2 |
| `dating-ui/.../me-matches/page.tsx` | design — list subtitle ← `primaryTakeaway` |
| `dating-ui/.../me-matches/page.spec.tsx` | design — assert no chip labels |
| `prisma/*` / `matchNarrative` / scores | **no change** |

---

## Decisions (do not reverse without discussion)

### 1. Which field the list shows (locked)

Today UI:

```tsx
{m.explainability?.reasonShort && ( ... {m.explainability.reasonShort} )}
```

**Change to:**

```tsx
{(m.recommendation?.primaryTakeaway || m.explainability?.reasonShort) && (
  ...
  {m.recommendation?.primaryTakeaway?.trim() || m.explainability?.reasonShort}
)}
```

- Prefer `primaryTakeaway` (plain after this story).
- Fallback `reasonShort` only if takeaway missing (legacy fixtures) — Agent 1 should still ensure live compare path always sets takeaway.
- **Do not** render `matchNarrative` on list (unchanged Story 22.3 lock).

### 2. Do not rewrite `reasonShort` in Story 1

- `buildReasonShort` still embeds chip labels for now (admin / audit / older clients).
- List stops reading it when takeaway is present.
- Story 4 may scrub `reasonShort` or list empty-path; out of scope here.

### 3. Plain TLDR builder (locked)

New pure module, e.g. `src/matches/match-list-tldr.ts`:

```ts
export const LIST_TLDR_MAX_CHARS = 120;

export function buildPlainMatchListTldr(input: {
  finalScore: number;
  positiveChips: readonly string[];
  /** optional; unused in v1 templates unless needed for thin-chip path */
  sharedInterestNote?: string;
}): string
```

**Rules:**

1. Map each known chip via **`listPhrase`** (short plain fragment, **not** the chip label, **not** full evidence sentence).
2. Take up to **2** phrases (chip order preserved).
3. Templates (deterministic; may use stable hash variant 0–1 if already used in recommendation — optional, keep simple if preferred):
   - 2 phrases: `You both share ${p1} and ${p2}.`
   - 1 phrase: `Clear overlap: ${p1}.`
   - 0 phrases: band line only — e.g.  
     - `finalScore >= 60` → `Some real overlap — open to see why.`  
     - `>= 40` → `A few touchpoints — open to see why.`  
     - else → `Limited overlap — open only if curious.`
4. **Hard cap:** if length > `LIST_TLDR_MAX_CHARS` (120), truncate at last space before cap and end with `…` (single unicode ellipsis).
5. **Invariant:** output must not contain any `Object.keys(CHIP_TO_TRAIT)` as a substring (case-insensitive). Unit-test this.
6. **No LLM.** No `about*`. No scores / `%` / “alignment” / “compatibility” in templates (avoid those words in `listPhrase` and band lines).

### 4. `listPhrase` data (locked shape)

Extend `CHIP_TO_TRAIT` values (preferred — one map) **or** sibling `CHIP_TO_LIST_PHRASE` (same keys). Agent 1 fills English phrases; examples for intent (not mandatory exact copy):

| Chip | `listPhrase` intent |
|------|---------------------|
| Ambition alignment | `drive on goals` |
| Emotional depth | `real emotional depth` |
| Lifestyle pace | `a similar daily pace` |
| Social rhythm | `matching social energy` |
| … | plain fragments for every existing `CHIP_TO_TRAIT` key |

Unknown chips: skip (same as traits builder).

### 5. Wire into recommendation (locked)

`buildPrimaryTakeaway(finalScore, explainability, stableId)` **must** return `buildPlainMatchListTldr({ finalScore, positiveChips: explainability.positiveChips, sharedInterestNote: explainability.sharedInterestNote })`.

- Drop current chip-lowercasing templates (`Strong clear fit around ${both}`).
- `stableId` / variant hash: optional for empty-band wording only; do not reintroduce chip names.
- `extractFallbackHint` chip-keyword path: unused once takeaway always comes from list TLDR builder (can leave dead or delete if tests allow).

### 6. Untouched

- Scoring, HG, blend weights, rank order.
- `matchNarrative` generator / cache / `promptVersion`.
- Detail page prose priority (narrative → takeaway → reasonShort).
- Prisma / migrations.

---

## API contract

**No new HTTP fields.** List + detail DTOs keep:

- `explainability.reasonShort` (may still be jargon)
- `recommendation.primaryTakeaway` (**plain** after this story)
- `matchNarrative?` (detail only; list must not show)

`GET /api/v1/me/matches` response shape unchanged; **content** of `primaryTakeaway` changes.

---

## Service signatures

```ts
// match-list-tldr.ts
LIST_TLDR_MAX_CHARS = 120
buildPlainMatchListTldr({ finalScore, positiveChips, sharedInterestNote? }): string

// match-recommendation.ts (behavior change only)
buildPrimaryTakeaway(...) → buildPlainMatchListTldr(...)

// match-explanation-traits.ts
CHIP_TO_TRAIT[chip].listPhrase: string  // or CHIP_TO_LIST_PHRASE[chip]
```

Nest services: no new providers. Compare / list mapping already attaches `recommendation`.

---

## Migration plan

**N/A** (no schema). Rollback = revert takeaway builder + UI field preference.

---

## Integration points

| Component | Action |
|-----------|--------|
| `match-list-tldr.ts` | New builder + max-len |
| `CHIP_TO_TRAIT` / list phrases | Add phrases for all known chips |
| `match-recommendation.ts` | primaryTakeaway ← plain TLDR |
| `me-matches/page.tsx` | Show primaryTakeaway first |
| Specs API + UI | No chip labels; truncate; empty chips |
| List “no matchNarrative” test | Keep green |

---

## Runtime topology

**N/A** — no realtime / proxy / cookies / migrations.

---

## E2E verification (agent 4)

**Skip Agent 4** — not eligibility / preference dimensions / ranking. DTO shape unchanged.

Agent 1/2: unit + Vitest list card. Optional operator eyeball: Your matches → toto card plain English.

If Agent 1 unexpectedly changes list DTO **shape**, revisit Agent 4 — not planned.

---

## Tests / verification (plan for Agent 1–2)

- [ ] `buildPlainMatchListTldr` with Ambition + Emotional depth → no those labels; length ≤ 120
- [ ] Empty chips → band line; no chip keys
- [ ] `buildPrimaryTakeaway` delegates / matches TLDR builder
- [ ] UI list renders takeaway; fixture with chip-y `reasonShort` must **not** show if takeaway plain is set
- [ ] UI still does not dump `matchNarrative` on list
- [ ] Existing recommendation / me-matches suites updated for new takeaway wording
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser smoke: deferred optional
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Story 4 owns remaining `reasonShort` jargon if anything still surfaces it.

---

## Next agent

```text
--agent 1 sprint 23 story 1
```

**Notes for next agent:**

- Implement `listPhrase` + `buildPlainMatchListTldr` + wire takeaway + UI switch.
- Do not call LLM. Do not change `matchNarrative` / `reasonShort` builder.
- After CR → `--agent 3 sprint 23 story 1` (skip 4).
