# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_teaser_wording_system.md](../../STORY_01_teaser_wording_system.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  

---

## Summary

- Add a **pure** `buildMatchTeaser(mode, facts, locale)` module that turns existing match facts into `MatchTeaserDto` for Modes A/B/C — **no layout, no ranking changes**.
- Attach `teaser` on `MeMatchItemDto` (list); default mode `first_chapter` until Story 5.
- **i18n locked:** builder emits **English only** in Story 1; `locale` param accepted but only `'en'` is implemented (HE deferred).
- Life-goal / kids / timeline facts are **optional structured inputs** assembled from enrichment already on engine payloads when present; never invent. Fall through to interests → scrubbed takeaway → safe HIGH fallback.
- **Skip Agent 4** (display DTO only; not eligibility / preference / ranking).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-teaser.ts` | **new** — `TeaserMode`, `MatchTeaserDto`, `MatchTeaserFacts`, caps, banned tokens, `buildMatchTeaser` |
| `dating-api/src/matches/match-teaser.spec.ts` | **new** — golden A/B/C + jargon + non-empty HIGH |
| `dating-api/src/me-profile/me-matches.service.ts` | attach `teaser` on list (and detail for parity) via assembler + builder |
| `dating-ui/src/lib/me-matches-api.ts` | mirror `TeaserMode` + `MatchTeaserDto` on `MeMatchItemDto` |
| `dating-api/docs/product/MATCH_CARD_TEASER_MODES.md` | Agent 3 only if formulas drift |
| Prisma / scoring / rank order / UI card layouts | **no change** (layouts = Stories 2–4; routing = Story 5) |

---

## Decisions (do not reverse without discussion)

### 1. Module placement — pure function, not Nest service (locked)

New file: `dating-api/src/matches/match-teaser.ts`  
Same pattern as `match-list-tldr.ts` / `match-recommendation.ts`.

- **No** Nest `@Injectable` provider.
- List/detail service calls a thin **assembler** (same file or `match-teaser.assemble.ts` if file grows) then `buildMatchTeaser`.
- Do **not** put user-facing copy builders under `domain/` or `evaluate/`.

### 2. Types + DTO location (locked)

```ts
/** Internal mode ids — never show age/generation labels in UI chrome. */
export type TeaserMode = 'first_chapter' | 'ready_again' | 'new_chapter';

export type MatchTeaserDto = {
  mode: TeaserMode;
  /** Always-visible primary lines (0–3). Mode B may be []. */
  lines: string[];
  /** Mode B hero sentence (life-goal claim). Omit for A/C. */
  claim?: string;
  /** Mode policy: badge/hero vs inline. */
  showScore: boolean;
  /** Score 0–100 when known; null when unscored. */
  score: number | null;
  /** Soft icebreaker hint (Mode A/C). Omit when no grounded ask. */
  askHint?: string;
};

export type TeaserLocale = 'en'; // Story 1; extend later
```

**API attach (additive):**

```ts
// MeMatchItemDto (+ MeMatchDetailDto for parity — same teaser object)
teaser: MatchTeaserDto;
```

- Always present when the row is returned (including hard-blocked / unscored): builder still runs with available facts.
- Unscored: `score: null`, modes still produce copy from chips/interests/fallback rules.
- **Do not** remove `explainability` / `recommendation` — Stories 2–4 may still use them; teaser is the stable card contract going forward.
- UI mirror: `dating-ui/src/lib/me-matches-api.ts` only in Story 1 (no card layout wiring yet).

### 3. Default mode until Story 5 (locked)

```ts
const DEFAULT_TEASER_MODE: TeaserMode = 'first_chapter';
```

- Story 1 always passes `first_chapter` from the list/detail assembler.
- Do **not** read age, onboarding chapter, or profile fields for mode selection here.
- Story 5 owns `datingChapter` + age fallback routing.

### 4. i18n — English from API; locale reserved (locked)

| Choice | Locked |
|--------|--------|
| Where strings live | **API builder** returns final display strings (like `primaryTakeaway` today) |
| Locale param | `buildMatchTeaser(mode, facts, locale: TeaserLocale = 'en')` |
| HE | **Out of Story 1.** Do not ship HE templates yet. If `locale !== 'en'`, still return EN (document in JSDoc) — no throw. |
| UI | Stories 2–4 render `teaser.*` as-is (same as English takeaway under `he` chrome today) |

Rationale: match copy is already English-from-API; HE UI chrome is separate. Avoid splitting Mode A/B/C formulas across two repos in Story 1.

### 5. Input facts shape (locked)

Builder must **not** take raw `MeMatchItemDto` or Prisma rows. Explicit fact pack:

```ts
export type MatchTeaserFacts = {
  /** Engine final score 0–100, or null. */
  score: number | null;
  /** HIGH | GOOD | OTHER — used for non-empty HIGH invariant. */
  priorityTier: 'HIGH' | 'GOOD' | 'OTHER';
  /** Chip labels from explainability (may contain jargon — scrub before emit). */
  positiveChips: readonly string[];
  sharedInterestNote?: string | null;
  primaryTakeaway?: string | null;
  reasonShort?: string | null;
  /**
   * Optional structured enrichment (viewer ↔ candidate), when already loaded
   * on engine payloads during list hydrate. All optional — never invent.
   */
  kidsAligned?: boolean | null;
  /** Short plain EN fragments already mapped from canonical labels — not raw snake_case. */
  kidsNote?: string | null;
  seriousnessNote?: string | null; // e.g. both want partnership / similar pace
  dailyRhythmNote?: string | null;  // vibe source (night owl / weekend energy)
  sharedInterestLabels?: readonly string[]; // raw tags before "You both enjoy…"
  locationOverlapNote?: string | null; // only if already known on pair; else omit
  /** Grounded ask fragment without leading "ask about" — builder may prefix. */
  askTopic?: string | null;
};
```

**Assembler rules (list path):**

1. From existing list hydrate / compare result: `score`, `priorityTier`, `explainability.*`, `recommendation.primaryTakeaway`.
2. From engine payloads **already in memory** for the pair (viewer + candidate `evaluation.enrichment.signals`): map kids / relationshipPace / dailyRhythm into optional notes via a small closed dictionary in `match-teaser.ts` (plain EN). If signals missing or disagree with no clear alignment → leave fields null (do not invent “aligned”).
3. **No new DB round-trips** for Story 1. If enrichment is not on the hydrated payload, skip priority-1 facts.
4. `askTopic`: only if a concrete shared interest label or prompt snippet exists; else omit `askHint`.
5. Do **not** feed `matchNarrative` into the builder (list must stay narrative-free; detail narrative stays separate).

### 6. Mode formulas (locked)

| Mode | `lines` | `claim` | `showScore` | `askHint` |
|------|---------|---------|-------------|-----------|
| `first_chapter` | **one** string joined with ` · ` (vibe · specific · ask?) — or 1–2 parts if sparse | omit | `true` (badge OK; UI Stories decide size) | set when ask part present **or** duplicate as optional field; prefer embedding ask in the line and still set `askHint` to the ask fragment for layout flexibility |
| `ready_again` | `[]` | one life-goal sentence, **≤12 words** | `true` | omit |
| `new_chapter` | `line1`: `{score}% · {seriousness}`; `line2`: `practical · soft?` | omit | `true` (score also inline in line1 when score known) | soft ask when grounded |

**Caps:**

| Constant | Value |
|----------|-------|
| `TEASER_MODE_A_MAX_CHARS` | 90 (single joined line) |
| `TEASER_MODE_B_MAX_WORDS` | 12 (`claim`) |
| `TEASER_MODE_C_LINE_MAX_CHARS` | 90 per line |
| `TEASER_ASK_HINT_MAX_CHARS` | 40 |

Truncate at last space + `…` (reuse style of `truncateListTldrLine`).

**Score formatting:** integer percent from `Math.round(score)` when `score != null`; if null, Mode C line1 becomes seriousness-only (no `% ·` prefix); Mode B still shows `showScore: true` with `score: null` (UI hides badge).

### 7. Source priority inside builder (locked)

For each mode slot (vibe / specific / claim / seriousness / practical), pick the first **non-empty grounded** source:

1. Structured enrichment notes (`kidsNote`, `seriousnessNote`, `dailyRhythmNote`, alignment flags)
2. Shared interests (`sharedInterestLabels` / scrubbed `sharedInterestNote` stripped of “You both enjoy”)
3. Scrubbed `primaryTakeaway` / chip `listPhrase` fragments (via existing `CHIP_TO_TRAIT[].listPhrase` — **not** raw chip labels)
4. Scrubbed `reasonShort` only if it passes banned-token scrub and is short enough
5. Fallback:
   - If `priorityTier === 'HIGH'` (or score ≥ 85): `"Worth a closer look"`
   - Else: still non-empty safe line `"Worth a closer look"` for list consistency **or** band-style short line — **locked:** always use `"Worth a closer look"` so teasers never empty when we emit a card. (Product: “never empty if match is HIGH”; extending to all tiers avoids empty UI holes.)

**Never invent** night-owl / Japan / kids claims without a fact source.

### 8. Banned tokens (locked — teaser-specific list)

Separate from `BANNED_NARRATIVE_PHRASES` (narrative bans `%` / “worth a closer look”, which **conflict** with teaser needs).

```ts
export const TEASER_BANNED_TOKENS: readonly string[] = [
  'alignment',
  'coefficient',
  'dealbreaker filter',
  'dealbreaker',
  'emotional depth', // raw chip echo — use listPhrase instead
  'friction score',
  'friction',
  'compatibility coefficient',
  'ambition alignment',
  // chip labels that must not appear verbatim:
  ...Object.keys(CHIP_TO_TRAIT), // or explicit chip label list
];
```

- Scrub: if a candidate fragment contains a banned token (case-insensitive), drop that fragment and fall through.
- Unit tests must assert golden outputs and random chip-label inputs never emit banned substrings.
- **Allowed:** `"Worth a closer look"` fallback; `%` in Mode C line1 / Mode B score display.

### 9. Golden fixtures (unit tests must encode these)

From sprint README / product doc — builder should produce **equivalent structure** (exact strings preferred when facts are stubbed to match):

**Mode A** (facts: night-owl vibe, Saturday baking specific, Japan ask):

- `lines: ['Both night owls · she bakes on Saturdays · ask about Japan']`
- `showScore: true`, `claim` omitted, `askHint: 'ask about Japan'` (or topic-only `Japan` — **locked:** `askHint` includes soft prefix `"ask about …"` when topic is a noun phrase)

**Mode B** (score 92, kids/serious claim):

- `lines: []`, `claim: 'Both want something serious — kids already clear'`, `showScore: true`, `score: 92`

**Mode C** (score 88):

- `lines: ['88% · both want a real partnership', 'Kids situation aligned · same city · ask about her travel']`
- `showScore: true`, `score: 88`

Agent 1 may split fixtures into `facts` stubs that deterministically yield these strings.

### 10. Untouched (locked)

- Match scores, HG filters, blend weights, `MatchListRank` order.
- `buildPlainMatchListTldr` / `primaryTakeaway` behavior (keep as-is; teaser is additive).
- Card layouts / browse one-liner swap → Stories 2–4.
- Onboarding `datingChapter` → Story 5.
- Prisma schema / migrations.
- LLM narrative generator.

---

## API contract

**Endpoint:** `GET /api/v1/me/matches` (and detail `GET /api/v1/me/matches/:id`)  
**Auth:** existing session guard — unchanged.

**Additive response field** on each match item:

```json
{
  "teaser": {
    "mode": "first_chapter",
    "lines": ["Same weekend energy · hiking + markets"],
    "showScore": true,
    "score": 88,
    "askHint": "ask about hiking"
  }
}
```

Mode B example:

```json
{
  "teaser": {
    "mode": "ready_again",
    "lines": [],
    "claim": "Both want something serious — kids already clear",
    "showScore": true,
    "score": 92
  }
}
```

**Status codes:** unchanged.  
**No new query params** in Story 1 (no `?teaserMode=`).

---

## Service signatures

```ts
// match-teaser.ts
export type TeaserMode = 'first_chapter' | 'ready_again' | 'new_chapter';
export type TeaserLocale = 'en';
export type MatchTeaserDto = { ... };
export type MatchTeaserFacts = { ... };

export const DEFAULT_TEASER_MODE: TeaserMode = 'first_chapter';
export const TEASER_BANNED_TOKENS: readonly string[];
export const TEASER_MODE_A_MAX_CHARS = 90;
export const TEASER_MODE_B_MAX_WORDS = 12;
export const TEASER_MODE_C_LINE_MAX_CHARS = 90;

export function buildMatchTeaser(
  mode: TeaserMode,
  facts: MatchTeaserFacts,
  locale?: TeaserLocale,
): MatchTeaserDto;

/** Optional helper for tests / scrub assertions. */
export function scrubTeaserFragment(text: string): string | null;

// me-matches.service.ts (Agent 1)
function assembleMatchTeaserFacts(/* hydrate + compare outputs */): MatchTeaserFacts;
// then: teaser: buildMatchTeaser(DEFAULT_TEASER_MODE, facts, 'en')
```

---

## Migration plan

**N/A** (no Prisma). Rollback = stop attaching `teaser` + delete module.

---

## Integration points

| Component | Action |
|-----------|--------|
| `matches/match-teaser.ts` | New types + builder + caps + banned list |
| `matches/match-teaser.spec.ts` | Golden A/B/C, bans, HIGH sparse non-empty |
| `me-matches.service.ts` | Assemble facts; attach `teaser` on list + detail |
| `me-matches.v1-contract.spec.ts` / list specs | Assert `teaser` present; mode default `first_chapter` |
| `dating-ui/.../me-matches-api.ts` | Type mirror only |
| Browse card / `matchBrowseOneLiner` | **Do not switch yet** (Story 2) |

---

## Runtime topology

**N/A** — no realtime / proxy / cookies / migrations.

---

## E2E verification (agent 4)

**Skip Agent 4** — not eligibility / preference dimensions / ranking. Additive display field only; order unchanged.

If Agent 1 accidentally changes rank order or score math → stop and require Agent 4 — not planned.

---

## Tests / verification (plan for Agent 1–2)

- [ ] Unit: golden Mode A / B / C fixtures match formulas
- [ ] Unit: banned tokens never appear in outputs (chip labels, “alignment”, “friction score”, …)
- [ ] Unit: HIGH + empty chips + no enrichment → non-empty teaser (`Worth a closer look`)
- [ ] Unit: length caps enforced (A chars, B words, C per-line)
- [ ] Unit: Mode B `lines` empty; `claim` set; `showScore === true`
- [ ] Unit: default mode path uses `first_chapter`
- [ ] Integration/contract: list items include `teaser`; no score/rank algorithm changes
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: N/A for Story 1 (types only on UI)
- [ ] Socket: N/A

---

## Open questions / blockers

- None blocking Story 1. Enrichment-backed kids/timeline copy quality improves when signals exist; sparse profiles still pass via takeaway/fallback.
- HE templates: deferred (explicit); revisit post–Sprint 44 or when product wants API-localized teasers.

---

## Next agent

```text
--agent 1 sprint 44 story 1
```

**Notes for next agent:**

1. Implement `match-teaser.ts` + golden unit tests first; then wire `MeMatchItemDto.teaser` with `DEFAULT_TEASER_MODE`.
2. Reuse `CHIP_TO_TRAIT[].listPhrase` — never emit raw chip labels.
3. Keep `primaryTakeaway` / browse one-liner behavior unchanged this story.
4. No Nest provider; no Prisma; no mode routing from age/chapter.
5. Suggested commit: `feat(matches): add mode-aware match teaser builder` / Sprint 44 Story 1.
