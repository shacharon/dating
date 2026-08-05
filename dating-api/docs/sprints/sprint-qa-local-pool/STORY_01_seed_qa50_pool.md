# Story 01 — Seed ~50 deletable Israel QA profiles

**Sprint QA local pool · Status: Done**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** None (clone patterns from `seed-sprint41-validation.ts`)  
**Repo:** `dating-api`  
**Handoffs:** `handoffs/STORY_01_seed_qa50_pool/agent-*.md`  
**Architect:** [handoffs/STORY_01_seed_qa50_pool/agent-0-architect.md](./handoffs/STORY_01_seed_qa50_pool/agent-0-architect.md)  
**Dev:** [handoffs/STORY_01_seed_qa50_pool/agent-1-dev.md](./handoffs/STORY_01_seed_qa50_pool/agent-1-dev.md)  
**CR:** [handoffs/STORY_01_seed_qa50_pool/agent-2-cr.md](./handoffs/STORY_01_seed_qa50_pool/agent-2-cr.md)  
**PM:** [handoffs/STORY_01_seed_qa50_pool/agent-3-pm.md](./handoffs/STORY_01_seed_qa50_pool/agent-3-pm.md)

---

## Objective

Create a **local-only** pool of ~50 synthetic `User` + `UserProfile` rows, all tagged with stable IDs under prefix **`qa50_`**, so they are **safe to delete** without touching the ~2 real email users.

---

## Target shape

| Attribute | Requirement |
|-----------|-------------|
| Count | ~50 ANALYZED profiles (exact N locked by Agent 0; default **50**) |
| Prefix | `qa50_user_*`, `qa50_prof_*`, `qa50_photo_*`, emails `qa50-*@bondit-test.local` |
| Ages | Spread ~22–45 (varied `birthDate`) |
| Location | `country: IL`; mix cities e.g. Tel Aviv, Jerusalem, Haifa, Beer Sheva, Eilat, Herzliya, Rishon LeZion, Netanya, … (≥6 distinct) |
| Gender | Balanced enough for reciprocal M↔F lists (Agent 0 locks split, e.g. ~25/25) |
| Interests | Across the pool, cover **all 24** enrichment allowlist codes (≥1 profile each); per profile typically 2–4 tags |
| Kids / HG-ish | Mix `wantsChildren` YES / NO / UNSURE |
| Photos | ≥1 APPROVED local placeholder PNG (distinct colors OK) |
| Eval + prefs | Full evaluation JSON + `UserProfilePreference` (genders + age window) |
| Cleanup | `--cleanup` deletes **only** `qa50_*` |

**Interests source of truth:** `INTEREST_ALLOWLIST` in `dating-api/src/evaluate/enrichment-v2.ts` (24 codes). Dual-write `interestsTop` + `UserProfileInterest`.

---

## Scope / Tasks

### Agent 0 (Architect)
1. ✅ Lock exact count, gender split, city list, interest coverage matrix → **50 total (25M/25F)**; **8 IL cities**; **all 24 interests**; 3 tags/profile
2. ✅ Lock ID scheme + safety guards → `qa50_*` + local-only abort (clone s41 safety)
3. ✅ Confirm do-not-touch → real emails + `s41val_*` never in cleanup
4. ✅ Viewers → **4 designated viewers inside the 50** + sessions in Story 1 (Story 3 = docs polish); **no MatchListRank** (Story 2)

### Agent 1 (Dev)
1. ✅ `scripts/qa50-fixtures.ts` (catalog) + `seed-qa50-pool.ts` (+ `--cleanup`)
2. ✅ `qa50-seed-safety.ts` (local-only guards)
3. ✅ npm scripts `seed:qa50` / `verify:qa50` — verify **PASS** locally
4. ✅ `QA50_POOL.md` with commands + 4 viewer cookies

### Agent 2 (CR)
1. ✅ Cleanup cannot delete non-`qa50_` users (smoke: realish/s41 unchanged)
2. ✅ All 24 interests; cities ≥6 (all 8); photos on disk; 3 tags/profile assert
3. ✅ No product UI / threshold changes
4. ✅ Prefix assert + scoped ID lists

### Agent 3 (PM)
1. ✅ Run seed + verify locally (`verify:qa50` PASS)
2. ✅ Spot-check cleanup safety (CR smoke: realish/s41 unchanged)
3. ✅ ACCEPT

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Total profiles | **50** (`qa50_*`) |
| Gender | **25 MALE / 25 FEMALE**, seek opposite only |
| Viewers | **4 of 50** (v01–v04) + fixed sessions in this story |
| Cities | 8 IL: Tel Aviv, Jerusalem, Haifa, Beer Sheva, Eilat, Herzliya, Rishon LeZion, Netanya |
| Interests | All **24** enrichment codes; **3 tags/profile**; dual-write |
| Ages | ~22–45 |
| wantsChildren | ~40% YES / 30% UNSURE / 30% NO |
| Photos | ≥1 APPROVED local PNG each |
| Ranks / matches | **Out of scope** → Story 2 |
| Cleanup | Only `qa50_*`; never real users / `s41val_*` |
| Env | Local Postgres + local photos; abort prod/S3/non-local DB |  

---

## Acceptance Criteria

- [x] 50 `qa50_*` ANALYZED profiles with APPROVED photos  
- [x] 25 M / 25 F; Israel cities diversified; ages ~22–45  
- [x] All 24 enrichment interest codes used in the pool  
- [x] 4 viewer sessions seeded; tokens documented  
- [x] `npm run seed:qa50 -- --cleanup` removes only `qa50_*` (implemented; CR to re-spot-check)  
- [x] Real users + `s41val_*` untouched by cleanup (scoped ID lists)  
- [x] `QA50_POOL.md` started  

---

## Suggested Commit

```
test(qa): seed qa50 deletable Israel profile pool

Sprint QA local pool Story 1
```
