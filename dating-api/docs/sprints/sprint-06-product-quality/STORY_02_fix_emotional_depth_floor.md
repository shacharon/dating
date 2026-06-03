# Story 2: Fix EMOTIONAL_DEPTH_FLOOR logic

**Sprint:** 6  
**Status:** Not started  
**Depends on:** —

---

## Why

`dealbreakers.ts` flags `EMOTIONAL_DEPTH_FLOOR` as `STRONG_FLAG` when **both** users have `emotionalDepth ≤ 3`. Two emotionally reserved or pragmatic people can be highly compatible — this rule unfairly suppresses their match score (−15 penalty each via STRONG_FLAG treatment).

---

## What

**As a** user with a reserved emotional style  
**I want** not to be penalized for matching with someone similarly reserved  
**So that** introvert/pragmatist pairs aren't incorrectly down-ranked

### Acceptance criteria

- [ ] **Remove or rewrite rule #4** — `EMOTIONAL_DEPTH_FLOOR` in `computeDealbreakers()` no longer fires on "both low depth"
- [ ] **Alternative (if architect chooses):** Only flag when one side is very high (≥8) AND other very low (≤2) — directional mismatch, not bilateral low
- [ ] **Tests updated** — `dealbreakers.spec.ts` (or equivalent) covers new behavior
- [ ] **Match engine regression** — pair with both depth ≤ 3 scores higher than before (no STRONG_FLAG)
- [ ] **Document in match-engine-overview.md** — emotional depth dealbreaker policy updated

### Out of scope (this story)

- Changing `emotionalDepth` extraction prompt
- UI copy about emotional compatibility

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_02_fix_emotional_depth_floor/agent-0-architect.md` after architect run.

Current logic (`dating-api/src/domain/dealbreakers.ts` ~lines 222–231):

```typescript
// 4) Emotional depth floor (both very low)
if (aDepth <= 3 && bDepth <= 3) {
  out.push({ code: 'EMOTIONAL_DEPTH_FLOOR', severity: 'STRONG_FLAG', ... });
}
```

Recommended fix: **delete this block entirely** or replace with one-sided high-vs-low mismatch.

---

## Definition of done

- [ ] EMOTIONAL_DEPTH_FLOOR behavior changed per AC
- [ ] Unit tests pass
- [ ] Match engine spec updated if it asserted this flag
- [ ] No other dealbreaker rules regressed

---

## Manual smoke

1. Rebuild/compare match where both profiles have `emotionalDepth: 2` → no EMOTIONAL_DEPTH_FLOOR in explain output  
2. Rebuild match where one has depth 9 and other depth 2 → appropriate flag if directional rule adopted

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Extraction quality for emotionalDepth | future |
