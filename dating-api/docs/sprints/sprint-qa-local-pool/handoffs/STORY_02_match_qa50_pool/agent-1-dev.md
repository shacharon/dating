# Handoff: Agent 1 — Dev — Sprint QA pool Story 2

**Agent:** 1 implement  
**Story:** [STORY_02_match_qa50_pool.md](../../STORY_02_match_qa50_pool.md)  
**Sprint:** sprint-qa-local-pool  
**Date:** 2026-08-05  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

QA viewers **v01–v04** now get **25 `MatchListRank` rows** each via `npm run qa50:ranks` (demo default: multi-tier scores). Optional `--engine` sync compare works but currently clusters OTHER — demo remains AC path. `s41val_` ranks untouched. Docs updated in `QA50_POOL.md`.

---

## Files

| Path | Change |
|------|--------|
| `dating-api/scripts/build-qa50-match-ranks.ts` | `--demo` (default) / `--engine` |
| `dating-api/scripts/verify-qa50-matches.ts` | Histograms + `--assert-demo` |
| `dating-api/package.json` | `qa50:ranks`, `verify:qa50-matches` |
| `dating-api/docs/.../QA50_POOL.md` | Rank commands + Bull warning |

---

## Verification (ran locally)

```bash
npm run qa50:ranks
# v01–v04: 25 ranks each HIGH=7 GOOD=9 OTHER=9; s41val unchanged (20)

npm run verify:qa50-matches -- --assert-demo
# PASS

npm run qa50:ranks -- --engine
# 25 ranks each, all OTHER — then restored demo
```

Live `GET /api/v1/me/matches` not reachable this session (API down) — Agent 3 smoke when stack up.

---

## Agent 2 focus

1. Rank writes only qa50 viewer userIds + qa50 candidates  
2. s41val ranks not deleted  
3. Demo AC ≥15 + ≥2 tiers  
4. No UI / threshold / engine formula edits  

---

## Commit

Not committed (Agent 3). Suggested:

```
test(qa): verify qa50 match lists and tier distribution

Sprint QA local pool Story 2
```

---

## Next command

```text
--agent 2 sprint qa-pool story 2
```
