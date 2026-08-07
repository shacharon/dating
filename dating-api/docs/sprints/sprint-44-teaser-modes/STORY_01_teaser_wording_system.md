# Story 01 — Teaser wording system + builder

**Sprint 44 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** None  
**Repo:** `dating-api` primarily (+ shared types for UI)  
**Risk:** Medium (copy quality + data shaping)  
**Handoffs:** `handoffs/STORY_01_teaser_wording_system/agent-*.md`

---

## Objective

Create a single **teaser builder** that turns existing match explainability into mode-aware teaser payloads with locked wording rules — no layout yet.

## Why

Today browse uses `primaryTakeaway` / chips as a one-liner (`matchBrowseOneLiner`). Modes A/B/C need different packaging of the same facts. Builder first → layouts consume a stable DTO.

---

## Locked wording model

### Mode ids
```ts
type TeaserMode = 'first_chapter' | 'ready_again' | 'new_chapter';
```

### Output DTO (add to match list/detail item)
```ts
type MatchTeaserDto = {
  mode: TeaserMode;
  /** Always-visible primary lines (1–3). */
  lines: string[];
  /** Optional quoted claim (Mode B hero sentence). */
  claim?: string;
  /** Show score badge / hero % — mode policy. */
  showScore: boolean;
  /** Score 0–100 if available. */
  score: number | null;
  /** Optional soft CTA hint (icebreaker), Mode A/C. */
  askHint?: string;
};
```

### Builder rules

| Mode | `lines` | `claim` | `showScore` |
|------|---------|---------|-------------|
| `first_chapter` | 1 string with ` · ` parts (vibe · specific · ask?) | omit | badge OK small, not hero |
| `ready_again` | omit or empty | one life-goal sentence | **true** (hero) |
| `new_chapter` | line1: `{score}% · {seriousness}` ; line2: practical · soft? | omit | **true** (inline in line1) |

### Source priority (facts only — no inventing)
1. Life goals / kids / timeline signals from explainability  
2. Shared interests / prompt snippets  
3. `primaryTakeaway` / `reasonShort` scrubbed of jargon  
4. Fallback: single safe line `"Worth a closer look"` / HE equivalent — never empty if match is HIGH

### Banned tokens (strip or rewrite)
`alignment`, `coefficient`, `dealbreaker filter`, `emotional depth` as raw chip echo, `friction score`

### Golden fixtures (unit tests must pass)
See sprint README examples for Modes A/B/C.

---

## Scope / tasks

### Agent 0
1. Lock DTO + mode enum location (`dating-api` + UI type mirror)
2. Map which existing explainability fields feed each formula
3. Decide: pure function module vs service
4. i18n: builder returns EN first; HE via locale param or UI copy layer — **lock one**

### Agent 1
1. Implement `buildMatchTeaser(mode, matchFacts, locale)`
2. Unit tests with golden fixtures (A/B/C)
3. Attach `teaser` to me-matches list DTO (mode default `first_chapter` until Story 5)
4. Do not change ranking

### Agent 2
1. No invented facts
2. Length caps enforced
3. Banned jargon scrubbed
4. HIGH + sparse profile still returns non-empty teaser

### Agent 3
1. Snapshot 10 real/fixture matches → A/B/C teasers
2. Human eyeball: would you send / open?
3. Update `MATCH_CARD_TEASER_MODES.md` if formulas drift

---

## Acceptance criteria

- [x] `MatchTeaserDto` on match list items
- [x] Builder covers all 3 modes with golden tests
- [x] Default mode `first_chapter` until Story 5
- [x] No score/rank algorithm changes
- [x] Jargon banned list enforced in tests

---

## Suggested commit

```
feat(matches): add mode-aware match teaser builder

Sprint 44 Story 1
```

---

## Close notes (Agent 3 · 2026-08-06)

- Shipped: `matches/match-teaser.ts` + list/detail `teaser` field; UI type mirror only.
- Card layouts still use `matchBrowseOneLiner` until Stories 2–4.
- HE templates deferred (EN-only API copy locked).
- Agent 4 skipped (display DTO; not eligibility/ranking).
