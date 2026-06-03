# Story 3: Remove LOW_INFO_PROFILE_IDS hardcode

**Sprint:** 5  
**Status:** Not started  
**Depends on:** —

---

## Why

`match-engine.ts` contains `LOW_INFO_PROFILE_IDS = new Set(['19'])` — a hardcoded test profile id that caps `finalScore` at 55. This is not maintainable, not discoverable, and wrong for production. Coverage-based scoring already exists; this hack should be replaced.

---

## What

**As a** match engine maintainer  
**I want** low-information profiles capped by coverage rules, not hardcoded ids  
**So that** score quality degrades predictably for any sparse profile

### Acceptance criteria

- [ ] **Remove `LOW_INFO_PROFILE_IDS`** — delete constant and all references in `match-engine.ts`
- [ ] **Coverage-based cap** — profiles below a documented coverage threshold (e.g. `< 0.4` or existing `MIN_COVERAGE_FOR_CONFIDENT_SCORE`) get `finalScore` capped (architect picks threshold and cap value)
- [ ] **Document in match-engine-overview.md** — replace LOW_INFO section with coverage cap rule
- [ ] **No profile-id special cases** — grep confirms no other hardcoded profile id hacks
- [ ] **Tests updated** — remove tests asserting profile `19` behavior; add coverage-threshold cap tests
- [ ] **Backward compat** — existing high-coverage profiles unaffected

### Out of scope (this story)

- Changing coverage factor formula itself
- UI display of "low confidence" badge (future)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_03_remove_low_info_profile_ids/agent-0-architect.md` after architect run.

Current code location:

```typescript
// dating-api/src/matches/match-engine.ts
const LOW_INFO_PROFILE_IDS = new Set<string>(['19']);
// ... caps finalScore at 55 when either profile in set
```

Existing coverage machinery:
- `compatibility-score.ts` — `coverage`, `MIN_COVERAGE_FOR_CONFIDENT_SCORE`
- `matches/coverage-policy.ts` — `scoreCoverageFactor`

Architect should prefer reusing existing coverage policy over inventing a parallel cap.

---

## Definition of done

- [ ] `LOW_INFO_PROFILE_IDS` removed
- [ ] Coverage-based cap implemented and documented
- [ ] `match-engine.spec.ts` updated — all pass
- [ ] `docs/match-engine-overview.md` updated
- [ ] `npm run build` + match-engine tests pass

---

## Manual smoke

1. Rebuild matches for a profile with very sparse signals → score capped appropriately  
2. Rebuild matches for a fully analyzed profile → score unchanged vs before (within rounding)

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| UI "low confidence" indicator | future sprint |
