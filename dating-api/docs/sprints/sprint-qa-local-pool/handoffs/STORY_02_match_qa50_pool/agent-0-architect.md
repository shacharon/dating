# Handoff: Agent 0 — Architect — Sprint QA pool Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_match_qa50_pool.md](../../STORY_02_match_qa50_pool.md)  
**Sprint:** sprint-qa-local-pool  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Match-rank build lock for QA pool. **No UI / threshold / engine formula changes.** **Skip Agent 4.**  
**Repos:** `dating-api` scripts + docs (`QA50_POOL.md`).

---

## Summary

Make `/dating/me-matches` usable for the **4 `qa50` viewers** by writing **`MatchListRank` rows** (materialized list path). **Hybrid (C):**

1. **Default / AC path:** `--demo` ranks — deterministic scores → guaranteed multi-tier Smart Triage (fast, no Redis).  
2. **Optional truth path:** `--engine` sync score using existing compare helpers — real-ish distribution for learning.  
3. **Optional ops path:** document full `npm run match-list:backfill-ranks` when Redis/worker is up (not required for AC).

Scripts **only write/delete ranks for `qa50` viewer userIds** (and qa50 candidates). **Never** delete `s41val_*` ranks.

---

## Baseline

| Fact | Detail |
|------|--------|
| Pool | Story 1: 50 profiles, 25 M / 25 F, 4 viewers with sessions |
| List read | `MATCH_LIST_MATERIALIZED` default **on**; list score = rank overlay (Sprint 41 CR) |
| Opposite pool size | Each viewer can see up to **25** opposite-gender qa50 profiles |
| Global backfill | `match-list:backfill-ranks` enqueues **all** list-ready viewers (needs Redis) — too broad for default QA |

---

## Decision: approach (locked) = Hybrid C

| Mode | Command (Agent 1 names) | When |
|------|-------------------------|------|
| **Demo (default)** | `npm run qa50:ranks` or `qa50:ranks -- --demo` | Always; satisfies Story 2 AC |
| **Engine (optional)** | `npm run qa50:ranks -- --engine` | Operator wants real scores; no Redis required if sync |
| **Bull backfill (docs only)** | `npm run match-list:backfill-ranks` | Full local stack; may rebuild non-qa50 viewers — warn in docs |

### Viewers vs candidates (locked)

| Role | Who |
|------|-----|
| Viewers | `QA50_VIEWERS` only: `v01`–`v04` |
| Candidates for a viewer | All other `qa50_*` profiles with **opposite gender**, `ANALYZED`, ≥1 APPROVED photo, not self |

Do **not** include `s41val_*` or real users in qa50 rank scripts.

### Demo score assignment (locked)

For each viewer, take opposite-gender candidates sorted by `profileId` ascending. Assign scores cycling bands so tiers appear:

| Band | Score sequence (repeat) | Tier |
|------|-------------------------|------|
| HIGH | 92, 88 | ≥85 |
| GOOD | 80, 76, 72 | 70–84 |
| OTHER | 62, 55, 48 | &lt;70 |

Pattern per 8 candidates: `92, 88, 80, 76, 72, 62, 55, 48` then repeat.  
Upsert `MatchListRank`: `hardBlocked: false`, fresh `builtAt`.  
Before upsert for a viewer: **deleteMany** ranks where `viewerUserId = that viewer` only (replace that viewer’s list; do not touch other viewers’ ranks in the same call beyond the 4).

### Engine mode (locked)

For each viewer + candidate pair:

1. Load profiles + latest evaluations (+ preference/signals/interests as needed).  
2. `buildMeMatchesParticipantReadModel` + `compareWithStatus` (same idea as list hydrate).  
3. If scored: `matchScore = finalScore`; if guard/null: skip or store `-1` unscored — prefer **skip** so list stays clean.  
4. Skip HG hard-fail pairs if directions FAIL (mirror list eligibility).  
5. Persist ranks; print tier histogram.

If engine yields &lt;10 rows for a viewer, print warning; demo mode remains the AC path.

### Bull backfill (docs only)

- Warn: enqueues **every** ANALYZED+photo viewer on the DB (including real + s41val).  
- Prefer qa50-scoped scripts for day-to-day QA.

---

## Decision: success criteria (locked)

| Check | Demo (AC) | Engine (soft) |
|-------|-----------|---------------|
| Ranks per viewer | **≥15** (expect ~25) | Report actual; target ≥10 |
| Tiers | **≥2 distinct** of HIGH/GOOD/OTHER | Report histogram |
| Live API | `GET /api/v1/me/matches` as v01 → `ready` + matches length ≥15 | Same if engine dense enough |
| UI | v01 cookie → `/dating/me-matches` shows sections/cards | Same |
| `s41val_*` | Rank rows for s41 viewers **unchanged** by `qa50:ranks` | Verify count or spot ID prefix |

---

## Decision: verify (locked)

Extend or add:

| Script | Role |
|--------|------|
| `verify:qa50` | Story 1 pool checks (keep) |
| `verify:qa50-matches` **or** `verify:qa50 -- --matches` | Per viewer: rank count, HIGH/GOOD/OTHER histogram, sample scores; assert demo AC when `--assert-demo` |

Agent 1 pick one interface; document in `QA50_POOL.md`.

---

## Decision: safety

- Reuse `assertQa50SafeEnvironment` on rank scripts.  
- Rank mutations only for `viewerUserId ∈ QA50_VIEWER userIds`.  
- Candidate profile IDs must be in `QA50_PROFILE_IDS`.  
- No product code under `dating-ui/` / `me-matches.service.ts` (overlay already shipped).

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `dating-api/scripts/build-qa50-match-ranks.ts` (name flexible) | `--demo` / `--engine`; scoped upserts |
| `dating-api/scripts/verify-qa50-matches.ts` (or flag on verify) | Histograms + asserts |
| `dating-api/package.json` | `qa50:ranks`, `verify:qa50-matches` |
| `QA50_POOL.md` | Seed → ranks → verify → cookie → UI; warn on global backfill |

---

## Agent 1 brief

1. Read this handoff + Story 02 + `QA50_POOL.md`.  
2. Implement demo ranks (default) + optional engine mode.  
3. Verify per-viewer counts/tiers; update docs.  
4. Smoke curl list as v01 if API up.  
5. No UI/threshold/engine formula changes; do not wipe s41val ranks.

**Next command:**

```text
--agent 1 sprint qa-pool story 2
```
