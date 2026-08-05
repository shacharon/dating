# Handoff: Agent 1 — Dev — Sprint QA pool Story 4

**Agent:** 1 implement  
**Story:** [STORY_04_real_viewer_qa50_list.md](../../STORY_04_real_viewer_qa50_list.md)  
**Sprint:** sprint-qa-local-pool  
**Date:** 2026-08-05  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Upgraded qa50 seed photos to synthetic gradient portraits (Approach A). Added `qa50:ranks-real` + `verify:qa50-real` with **scoped** qa50-only rank replace. Smoke as `shacharon@gmail.com`: **50** qa50 ranks (seeks M+F), tiers 14/18/18, **non-qa50 ranks preserved (1)**. No LLM analysis; no UI.

---

## Files

| Path | Change |
|------|--------|
| `scripts/seed-qa50-pool.ts` | `syntheticPortraitPng` (~320px) |
| `scripts/build-qa50-ranks-for-real-viewer.ts` | New — `--email` / env / `--userId` |
| `scripts/verify-qa50-real-viewer.ts` | New — `--assert-demo` ≥5 + ≥2 tiers |
| `package.json` | `qa50:ranks-real`, `verify:qa50-real` |
| `docs/.../QA50_POOL.md` | Real-me path first; fake login parked |

---

## Verification

```bash
npm run seed:qa50
npm run verify:qa50
npm run qa50:ranks-real -- --email=shacharon@gmail.com
# qa50 ranks written: 50  HIGH=14 GOOD=18 OTHER=18
# non-qa50 ranks unchanged (1)

npm run verify:qa50-real -- --email=shacharon@gmail.com --assert-demo
# PASS
```

---

## Agent 2 focus

1. Scoped delete only `candidateProfileId startsWith qa50_`  
2. Refuse `qa50_` / `s41val_` as viewer  
3. Photos local-only; no prod instructions  
4. `qa50:ranks` unchanged (still qa50 viewers only)

---

## Commit

Not committed (Agent 3). Suggested:

```
test(qa): attach qa50 ranks to real local viewer with photos

Sprint QA local pool Story 4
```

---

## Next command

```text
--agent 2 sprint qa-pool story 4
```
