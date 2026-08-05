# Sprint QA — Local Israel match pool (~50 profiles)

**Status:** ✅ Done (Stories 01–03)  
**Priority:** P1 (QA / understanding Smart Triage with volume)  
**Depends on:** Sprint 41 Stories 1–2 shipped (browse + priority UI)  
**Blocks:** Better human validation of Story 41.3 (optional follow-up with real photos later)  
**Repo:** Primarily `dating-api` (seed/scripts/docs); UI unchanged  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

---

## Why

You have **~2 real email users**. Smart Triage (photo-first + HIGH/GOOD/OTHER) is hard to understand on a tiny pool. We need a **local-only, deletable** pool of ~50 diverse ANALYZED profiles in Israel so you can browse a realistic list, run matches, and optionally fake 3–4 logins.

**Not production. Not real people. Marked for delete.**

---

## Goal

1. Seed **~50** synthetic profiles (`qa50_*` IDs) — ages, Israel cities, interests covering **all enrichment allowlist codes**.
2. Make them **list-ready** (ANALYZED + APPROVED photo + evaluation + preference).
3. **Generate matches** (prefer real `match-list:backfill-ranks` for truth; optional fixed ranks for demos).
4. Provide **3–4 fake viewer sessions** (cookie login) — lower priority than the pool itself.
5. One-command **`--cleanup`** that deletes only `qa50_*` (never touch real email users).

---

## Non-goals

- Production / staging / AWS seeding  
- Replacing the 2 real users  
- Real face photos (color placeholders OK for QA; note UX limits)  
- Changing priority thresholds or browse UI  
- Completing Sprint 41 Story 3 human PASS/FAIL (this *helps* that later)

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [Seed ~50 deletable Israel profiles](./STORY_01_seed_qa50_pool.md) | P0 | 0.5–1d | Done |
| 02 | [Run / verify match lists for QA viewers](./STORY_02_match_qa50_pool.md) | P0 | 0.5d | Done |
| 03 | [Fake 3–4 QA logins + operator guide](./STORY_03_qa50_fake_logins.md) | P1 | 0.25d | Done |

**Order:** 01 → 02 → 03.

---

## Locked constraints (draft — Agent 0 Story 1 hardens)

| Item | Decision |
|------|----------|
| ID prefix | `qa50_` only — cleanup scoped to prefix |
| Environment | Local Postgres + local photos only (same safety guards as `s41val_`) |
| Real users | **Never** modify/delete non-`qa50_` accounts |
| Country | Israel (`IL`) — cities free-text mix |
| Interests | Cover all **24** enrichment codes across the pool (`enrichment-v2` allowlist) |
| Photos | ≥1 APPROVED local placeholder per profile |
| Match path | Prefer Bull backfill → `MatchListRank`; document fallback |
| Fake logins | 3–4 fixed `dating_session` tokens (Story 3) |

---

## What else (recommended extras)

| Extra | Why |
|-------|-----|
| Gender balance | Enough M↔F reciprocal pairs or list looks empty |
| `wantsChildren` mix | YES / NO / UNSURE so HG / copy variety shows |
| Age band ~22–45 | Hits preference windows |
| `UserProfilePreference` | `acceptedPartnerGenders` + age min/max |
| Full evaluation JSON | Avoid `INSUFFICIENT_DATA` / missing Why chips |
| Operator doc | `QA50_POOL.md` — seed, cleanup, cookies, “don’t backfill over s41val by accident” |
| Keep `s41val_` separate | Sprint 41 validation fixtures stay intact |
| Optional: wipe QA `MatchAction` | Clean Like/Pass between QA sessions |
| Later: swap in real JPEGs | Only if validation needs face realism |

---

## Success

- [x] `npm run seed:qa50` creates ~50 profiles  
- [x] `npm run seed:qa50 -- --cleanup` removes only `qa50_*`  
- [x] At least one QA viewer sees a multi-tier match list on `/dating/me-matches`  
- [x] All 24 interest codes appear on ≥1 profile  
- [x] ≥3 Israel cities represented  
- [x] Docs list cookies for 3–4 fake logins  
- [x] Real email users untouched after cleanup  

---

## Suggested overall commit

```
test(qa): add deletable qa50 Israel match pool seed

Sprint QA local pool
```
