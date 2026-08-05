# Handoff: Agent 0 — Architect — Sprint QA pool Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_seed_qa50_pool.md](../../STORY_01_seed_qa50_pool.md)  
**Sprint:** sprint-qa-local-pool  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product UI / threshold / engine changes.** **Skip Agent 4.**  
**Repos:** `dating-api` scripts + docs only.

---

## Summary

Seed a **local-only, deletable** pool of **50** `qa50_*` ANALYZED profiles in Israel (25 M / 25 F), covering **all 24** enrichment interest codes, mixed ages/cities/`wantsChildren`, with APPROVED local photos + evaluations + preferences. **4 of the 50** are designated QA viewers (sessions included so smoke works early; Story 3 polishes the operator guide). Cleanup deletes **only** `qa50_*`. Do **not** touch real email users or `s41val_*`. **No `MatchListRank` in this story** — Story 2.

---

## Baseline (reuse)

| Pattern | Path |
|---------|------|
| Best template | `scripts/seed-sprint41-validation.ts` + fixtures + safety |
| Interest codes (24) | `src/evaluate/enrichment-v2.ts` `INTEREST_ALLOWLIST` |
| Safety | Clone/adapt `scripts/sprint41-validation-safety.ts` → `scripts/qa50-seed-safety.ts` (or export shared helper; do not couple QA to s41val IDs) |
| Photos | Solid PNG under local `PHOTO_UPLOAD_DIR` |
| Eval shape | Sprint-21 / s41 domain + `COMPATIBILITY_SIGNAL_KEYS` + `enrichment.signals.interestsTop3` |

---

## Decision: pool shape (locked)

### Counts

| Bucket | Count | Notes |
|--------|-------|-------|
| **Total profiles** | **50** | Hard target |
| Male / Female | **25 / 25** | All seek **opposite** gender only (simple reciprocal lists) |
| Designated viewers | **4** (subset of 50) | See table below — not extra rows |
| Pool “others” | **46** | Remaining of the 50 |

**Reject:** 50 candidates + 4 separate viewers (54) — keep one `qa50_*` namespace and one cleanup.

### Designated viewers (locked personas)

| Key | Gender | Age≈ | City | Seeking | `wantsChildren` | Role |
|-----|--------|------|------|---------|-----------------|------|
| `v01` | MALE | 30 | Tel Aviv | FEMALE | YES | Primary smoke viewer |
| `v02` | FEMALE | 28 | Haifa | MALE | YES | Opposite gender smoke |
| `v03` | MALE | 38 | Jerusalem | FEMALE | UNSURE | Older / different city |
| `v04` | FEMALE | 33 | Beer Sheva | MALE | NO | Kids mismatch variety |

IDs: `qa50_user_v01` … `qa50_prof_v01`, sessions `qa50_sess_v01`, raw tokens `qa50-viewer-v01-session-token-fixed-01` (same pattern for v02–v04).

Story 1 **creates sessions** for these 4 (print tokens at end of seed). Story 3 expands `QA50_POOL.md` operator UX; no need to wait for Story 3 to log in.

### Ages (locked)

- Birth years spread so ages ≈ **22–45** as of 2026.
- Viewers use ages above; remaining 46: distribute roughly evenly across the band (Agent 1 may use deterministic formula from index).

### Cities (locked — 8)

Rotate across all 50:

1. Tel Aviv  
2. Jerusalem  
3. Haifa  
4. Beer Sheva  
5. Eilat  
6. Herzliya  
7. Rishon LeZion  
8. Netanya  

Fields: `city` = name, `country` = `IL`, `locationLabel` = `{city}, IL`.

### Interests (locked)

**Source:** the 24 enrichment codes:

```
walking, hiking, music, reading, swimming, lifting, cycling, cooking,
travel, photography, extreme_sports, journaling, yoga, gaming,
meditation, pilates, gym, running, fungi, pottery, model_building,
boating, fermentation, cartography
```

| Rule | Lock |
|------|------|
| Coverage | Each code on **≥1** profile |
| Per profile | **Exactly 3** tags (fits `interestsTop3` / chips) |
| Dual-write | `UserProfile.interestsTop` + `UserProfileInterest` rows (`source: qa50_seed`) |
| Matrix | Agent 1: round-robin / block assign so first 24 profiles guarantee each code once; remaining slots fill with varied triples |

### `wantsChildren` (locked mix across 50)

Approximate: **~40% YES / ~30% UNSURE / ~30% NO** (viewers already fixed above; fill rest to hit mix). Values: `YES` \| `NO` \| `UNSURE` only.

### Signal diversity (eval)

Vary self-signal baseline by profile index (e.g. 3–8) so Story 2 backfill can produce score spread — **not** fixed HIGH/GOOD/OTHER here.

### Preference row (every profile)

| Field | Value |
|-------|-------|
| `acceptedPartnerGenders` | Opposite gender only |
| `partnerAgeMin` | 22 |
| `partnerAgeMax` | 45 |

Also set `desiredPartnerGenders` on profile JSON to match.

---

## Decision: IDs & cleanup (locked)

| Entity | Pattern |
|--------|---------|
| User | `qa50_user_{nn}` or `qa50_user_v0{1-4}` |
| Profile | `qa50_prof_{nn}` / `qa50_prof_v0{1-4}` |
| Photo | `qa50_photo_{same}` |
| Session | `qa50_sess_v0{1-4}` |
| Email | `qa50-{key}@bondit-test.local` |
| Nickname | `qa50_{key}` (unique) |
| googleId | `google_qa50_{key}` |

**Cleanup order** (only rows whose IDs/userIds/profileIds are in the qa50 catalog):

1. MatchListRank where viewer or candidate is qa50 (defensive — Story 2 may create)  
2. MatchAction involving qa50 users  
3. Photos + local files  
4. Interests, signals, evaluations, preferences  
5. Sessions  
6. Profiles → Users  

**Hard rules:**

- `where: { id: { in: QA50_ALL_IDS } }` / userId lists — **never** `deleteMany` without prefix filter  
- Abort if any would-be delete id does not start with `qa50_` (belt-and-suspenders assert in cleanup)  
- **Do not** delete `s41val_*` or real emails  

---

## Decision: environment safety (locked)

Same class of guards as Sprint 41 validation:

- Abort if `NODE_ENV=production`  
- Abort if `PHOTO_STORAGE_DRIVER=s3`  
- Abort if `DATABASE_URL` host not in `{localhost, 127.0.0.1, ::1, host.docker.internal}`  
- Require `SESSION_SECRET_PEPPER` when writing sessions  

---

## Decision: out of scope this story

| Item | Where |
|------|-------|
| `MatchListRank` / backfill | Story 2 |
| Operator polish / cookie guide depth | Story 3 (tokens already printed in Story 1) |
| Real face photos | Follow-up |
| UI / priority thresholds / engine | Never this sprint |
| Touching real Google email users | Forbidden |

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `dating-api/scripts/qa50-fixtures.ts` | Catalog: 50 defs, interest matrix, cities, viewers |
| `dating-api/scripts/qa50-seed-safety.ts` | Local-only guards |
| `dating-api/scripts/seed-qa50-pool.ts` | Upsert seed + `--cleanup` |
| `dating-api/scripts/verify-qa50-pool.ts` | Count 50, 25/25, 8 cities used, 24 interests covered, photos on disk, 4 sessions |
| `dating-api/package.json` | `seed:qa50`, `verify:qa50` |
| `dating-api/docs/sprints/sprint-qa-local-pool/QA50_POOL.md` | Skeleton: commands, viewer tokens, coverage summary |

Clone photo/eval helpers from s41; **do not** mutate s41 scripts.

---

## Verify checklist (Agent 1 / 2)

- [ ] 50 profiles, all `qa50_*`, status ANALYZED  
- [ ] 25 MALE / 25 FEMALE  
- [ ] ≥1 APPROVED photo each; files exist under upload dir  
- [ ] All 24 interest codes present ≥1×  
- [ ] ≥6 of 8 locked cities appear (prefer all 8)  
- [ ] 4 viewer sessions hash-match printed raw tokens  
- [ ] Cleanup dry-run / run leaves non-qa50 users intact (spot-check: count users with email not `@bondit-test.local` unchanged)  
- [ ] `s41val_*` still present if previously seeded  

---

## Agent 1 brief

1. Read this handoff + Story 01.  
2. Implement fixtures + seed + cleanup + verify + npm scripts.  
3. Write `QA50_POOL.md` with seed/cleanup/verify and the 4 viewer cookies.  
4. No ranks, no UI, no engine changes.

**Next command:**

```text
--agent 1 sprint qa-pool story 1
```
