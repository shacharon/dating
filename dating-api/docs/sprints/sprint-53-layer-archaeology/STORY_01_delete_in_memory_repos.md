# Story 01 — Delete dead in-memory repos

**Sprint 53 · Done · P2 · ~0.5d**

**Status:** Done  
**Tip:** `feature/sprint-53-story-1` @ `593aaec`

Remove `infrastructure/.../in-memory-*` MatchesRepository (and similar) with zero production consumers. Grep-prove unused first.

## Definition of done

- [x] Grep proof recorded; deletion set removed; empty dirs gone
- [x] `domain/index.ts` no longer exports matches repository
- [x] `UserProfilesRepository` + Prisma path untouched
- [x] Typecheck green; Agent 2 confirms symbols gone
- [x] Sprint-53 docs committed
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
