# Handoff: Agent 1 — Dev — Sprint QA pool Story 1

**Agent:** 1 implement  
**Story:** [STORY_01_seed_qa50_pool.md](../../STORY_01_seed_qa50_pool.md)  
**Sprint:** sprint-qa-local-pool  
**Date:** 2026-08-05  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Seeded **50** local `qa50_*` Israel profiles (25/25 gender), 8 cities, all **24** interest codes, APPROVED placeholder photos, evaluations + prefs. **4 viewers** have fixed `dating_session` tokens. Cleanup scoped to `qa50_*`. **No ranks** (Story 2). **No UI changes.**

---

## Files

| Path | Change |
|------|--------|
| `dating-api/scripts/qa50-fixtures.ts` | Catalog of 50 defs |
| `dating-api/scripts/qa50-seed-safety.ts` | Local-only guards |
| `dating-api/scripts/seed-qa50-pool.ts` | Seed + `--cleanup` |
| `dating-api/scripts/verify-qa50-pool.ts` | Verify coverage |
| `dating-api/package.json` | `seed:qa50` / `verify:qa50` |
| `dating-api/docs/.../QA50_POOL.md` | Operator cheat sheet |

---

## Verification (ran locally)

```bash
npm run seed:qa50
npm run verify:qa50
# PASS
```

**Viewer cookies:** see `QA50_POOL.md` (`qa50-viewer-v01-session-token-fixed-01` … v04).

---

## Agent 2 focus

1. Cleanup only `qa50_*` + prefix assert  
2. 24 interests + ≥6 cities + 25/25  
3. Real users / `s41val_*` not in cleanup lists  
4. No product/UI/threshold edits  

---

## Commit

Not committed (Agent 3). Suggested:

```
test(qa): seed qa50 deletable Israel profile pool

Sprint QA local pool Story 1
```

---

## Next command

```text
--agent 2 sprint qa-pool story 1
```
