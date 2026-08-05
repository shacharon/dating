# Handoff: Agent 0 — Architect — Sprint 41 Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_validation_testing.md](../../STORY_03_validation_testing.md)  
**Sprint:** sprint-41-smart-triage-ui  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Protocol + fixture lock. **No product feature code** (Stories 1–2 UX stays frozen). **Skip Agent 4.**  
**Repos:** `dating-api` seed/docs + optional thin verify script; `dating-ui` only if a tiny `?validation=1` console helper is needed (default: **no UI change**).

---

## Summary

This story is the **kill/continue gate** before Sprint 42. Agent 1 builds **local-only synthetic fixtures** (2 viewers + 10 candidates with controlled HIGH/GOOD/OTHER mix + APPROVED photos + `MatchListRank` scores). Agent 2 reviews realism + no prod pollution. Agent 3 runs **5 × ~10 min** human sessions on localhost and writes `VALIDATION_RESULTS.md` + the PASS / MIXED / FAIL decision.

**Do not** change priority thresholds, browse layout, or scoring engine in this story. Measure what Stories 1–2 already ship.

---

## Baseline facts (verified)

| Fact | Detail |
|------|--------|
| Browse UX | Story 1 photo-first cards + Story 2 HIGH/GOOD/OTHER sections |
| Tiers | HIGH ≥85, GOOD ≥70, OTHER &lt;70 (`match-priority.ts`) — **frozen** |
| List gate | Candidates need ≥1 `UserProfilePhoto` with `status: APPROVED` |
| Scores on list | Prefer materialized `MatchListRank.matchScore` path when ranks exist |
| Existing seeds | `seed-mock-candidates.ts`, `seed-sprint21-fixtures.ts`, `seed-phase1-validation.ts` — useful patterns; **do not** overload them |
| Client analytics | `emitProductLog` already emits `match.card_viewed`, `match.priority_section_viewed`, `match.priority_section_expanded` |
| Story 2 PM deferral | Live HIGH/GOOD/OTHER **distribution** measurement lands here |

---

## Decision: environment (locked)

| Option | Verdict |
|--------|---------|
| Production / AWS with real users | **Reject** |
| Shared staging with non-synthetic accounts | **Reject** |
| **Localhost API + UI + local Postgres (`DATABASE_URL`)** | **Lock** |

| Surface | Value |
|---------|--------|
| UI | `http://localhost:3000` (or project default) → `/dating/me-matches` |
| API | Local Nest (`localhost:3001` typical) |
| DB | Local Postgres only — script must refuse or no-op if `DATABASE_URL` host looks like prod (see safety) |
| Auth | Fixed session tokens for viewer accounts (same pattern as `seed-phase1-validation.ts`) |
| Testers | Laptop or phone on same LAN pointing at **local** UI; never cloud-dev |

**Safety (Agent 1 must implement):**

- Stable ID prefix: `s41val_`
- `--cleanup` flag deletes only `s41val_*` rows
- Guard: abort if `NODE_ENV=production` **or** `DATABASE_URL` matches obvious prod host patterns (document the check in script header)
- No writes to S3 prod buckets — use **local photo storage** + write tiny JPEG/PNG files under upload dir

---

## Decision: fixture shape (locked)

### Counts

| Role | Count | Notes |
|------|-------|-------|
| Viewers | **2** | Enough for gender/orientation diversity; each tester uses **one** viewer session |
| Candidates visible to primary viewer | **10** | Exact list for the main protocol |
| Optional 2nd pool | Same 10 or mirrored opposite-gender set for viewer B | Prefer **one shared opposite-gender candidate pool** if both viewers seek that gender; else seed 10 per viewer |

**Primary protocol viewer (Viewer A):** Male, ~32, seeking female, wants kids, tech-ish — matches story sketch.  
**Viewer B:** Female, ~29, seeking male — for optional second-session / gender sanity; Agent 3 may run all 5 testers on Viewer A only if time-constrained (**lock: ≥1 full session on Viewer A with the 10-candidate pool**).

### Priority distribution (Viewer A → 10 candidates)

| Tier | Count | Score band (explicit `MatchListRank.matchScore`) |
|------|-------|--------------------------------------------------|
| HIGH | **2** | 88–94 |
| GOOD | **4** | 72–82 |
| OTHER | **4** | 45–65 |

Target ≈ **20% / 40% / 40%** (aligns Story 2 tuning table). Agent 1 **upserts `MatchListRank`** with these scores — **do not** rely on live engine luck for the UX test. Still seed **realistic** evaluations / interests / nicknames so “Why we matched” and chips are non-empty when the list path can produce them.

### Diversity (required attributes across the 10)

Vary across candidates (document in `TEST_PROFILES.md`):

- Ages ~26–38
- Interests / industry labels (tech, creative, outdoors, etc.)
- Life goals: wants kids vs unsure vs no (at least one clear **mismatch** in OTHER)
- Photo variety: different placeholder images (color/solid or tiny distinct JPEGs) — **not** ten identical bytes
- At least one HIGH with strong shared “kids + career” story; at least one OTHER that is attractive-ish copy but low score (tests “would you HIGH-swipe a 6/10 photo?”)

### Photos (locked)

Every viewer + every candidate:

- ≥1 `UserProfilePhoto`, `status: APPROVED`, `isPrimary: true`
- Bytes written via local storage (`LocalPhotoStorage.save` pattern or equivalent `fs` write to configured upload dir)
- Mime `image/jpeg` or `image/png`; tiny valid image buffers OK

Broken/null photos **fail** Agent 1 verification (list gate).

### Sessions (locked)

Per viewer: stable `UserSession` + printed **raw cookie token** (phase-1 style) so Agent 3 can set `dating_session` without Google OAuth during sessions.

### Algorithm (locked interpretation)

Story text “run algorithm” = **materialize ranks for the test viewers**. Preferred path:

1. Seed profiles + photos + evaluations  
2. Upsert `MatchListRank` rows with locked scores + `hardBlocked: false` + fresh `builtAt`  
3. Optional: call existing compare helpers only if needed for explainability — **do not** block on full Bull backfill if ranks are written directly  

Verify with: `GET /api/v1/me/matches` as Viewer A → 10 items, tiers 2/4/4, sorted DESC within sections after UI grouping.

---

## Decision: analytics (locked)

| Source | Use |
|--------|------|
| **Human stopwatch + observer worksheet** | **Primary** for time-to-first Like/Pass |
| Existing `emitProductLog` (DevTools console) | Secondary — card viewed, section viewed/expanded |
| New server `ProductAnalyticsEvents` / DB tables | **Reject** this story |
| Persisted analytics files in repo during session | **Reject** (privacy / noise) |

### Agent 1 analytics deliverable (minimal)

1. **`scripts/verify-sprint41-validation-fixtures.ts`** (or npm script) prints for Viewer A:
   - match count  
   - HIGH / GOOD / OTHER counts + scores  
   - approved photo check  
2. Optional console-only: at seed end, print “open DevTools → filter `match.`”  
3. **No** required `?validation=1` UI flag unless Agent 1 finds sessions unusable without a session-start log — default **omit**

### Observer metrics (per tester) — Agent 3 worksheet

Copy into session notes / fold into `VALIDATION_RESULTS.md`:

| Metric | How | Target |
|--------|-----|--------|
| Time to first Like/Pass | Stopwatch from `/dating/me-matches` paint | &lt;5s average |
| Why-expand on HIGH | Count expands / HIGH cards seen | &gt;50% |
| Why-expand on OTHER | Count / OTHER cards seen (if opened) | &lt;20% preferred |
| Opened GOOD section? | Y/N | Informational |
| Opened OTHER section? | Y/N | Informational |
| “Message first?” | HIGH vs GOOD vs OTHER vs “by photo only” | ≥60% say HIGH (or photo-in-HIGH) |
| Positive overall (“would use / find priorities helpful”) | Y/N | ≥3/5 for PASS |

---

## Decision: protocol (locked)

**Participants:** 5 (product owner’s wife + 4 friends/family)  
**Duration:** ~10 min each (silent observe 2–3 min, then scripted questions)  
**Start URL:** `/dating/me-matches` logged in as Viewer A (or B if scheduled)

### Script (Agent 3 — do not improvise order)

1. “This is a dating app I’m building. Browse these matches naturally.”  
2. Observe silently 2–3 minutes (no coaching on priority).  
3. “Which match would you message first? Why?”  
4. “Did you notice the priority sections? Were they helpful?”  
5. “Would you swipe right on someone just because they’re HIGH priority, even if the photo is a 6/10?”  
6. “Any confusion or frustration?”  
7. Open-ended: like / annoy / vs Tinder / does ranking feel accurate or arbitrary?

### Outcomes (unchanged story thresholds)

| Outcome | Criteria | Action |
|---------|----------|--------|
| **PASS** | ≥3/5 positive **and** metrics roughly hit targets | Start Sprint 42 |
| **MIXED** | 2–3/5 positive or metrics soft-miss with clear fixable top concern | Note tweaks (e.g. hide `%`), then Sprint 42 |
| **FAIL** | ≤1/5 positive **or** priorities ignored as worthless | **Stop** Sprint 42; reassess pivot |

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `dating-api/scripts/seed-sprint41-validation.ts` | **New** — upsert viewers, 10 candidates, photos, ranks; `--cleanup` |
| `dating-api/scripts/verify-sprint41-validation-fixtures.ts` | **New** — print tier distribution + photo gate |
| `dating-api/package.json` | Optional npm scripts `seed:sprint41-validation` / `verify:sprint41-validation` |
| `dating-api/docs/sprints/sprint-41-smart-triage-ui/TEST_PROFILES.md` | Skeleton filled from seed (IDs, scores, attrs, session tokens) |
| `dating-api/docs/sprints/sprint-41-smart-triage-ui/VALIDATION_RESULTS.md` | **Template only** (empty metrics) — Agent 3 fills |
| `dating-api/docs/sprints/sprint-41-smart-triage-ui/VALIDATION_SESSION_WORKSHEET.md` | Optional 1-page per-tester checklist |

**Do not change:**

| Path | Reason |
|------|--------|
| `match-priority.ts` thresholds | Frozen until FAIL/MIXED decision |
| Browse / priority UI components | Validation of shipped UX |
| Engine scoring formulas | Synthetic ranks for UX |
| Production / cloud deploy configs | Local only |

---

## Agent 2 focus

1. Realism: not all 10/10 beauty + 95% scores; OTHER includes plausible people  
2. HIGH reasons coherent with copy (kids/values), not random high numbers only  
3. Cleanup + prod guard actually safe  
4. Analytics plan = stopwatch + existing console events (no new persistence)  
5. Verify script output matches 2/4/4

---

## Agent 3 focus

1. Run seed + verify on local stack before first human  
2. Five sessions; fill worksheet + `VALIDATION_RESULTS.md`  
3. Explicit **Decision:** PASS / MIXED / FAIL with one-paragraph rationale  
4. Commit only when asked (docs + seed), message style per story Suggested Commit  
5. Live smoke of Stories 1–2 during sessions doubles as deferred Story 2 distribution check

---

## Acceptance mapping

| AC | Owner | How |
|----|-------|-----|
| 10 diverse test profiles | Agent 1 | Seed + `TEST_PROFILES.md` |
| 5 people × 10 min | Agent 3 | Sessions |
| Quantitative metrics | Agent 3 | Worksheet → results table |
| Qualitative feedback | Agent 3 | Quotes in results |
| `VALIDATION_RESULTS.md` | Agent 3 | Final doc |
| Decision PASS/MIXED/FAIL | Agent 3 | Top of results |

---

## Open questions / non-blockers

- None blocking Agent 1.  
- If local photo serving fails in env, Agent 1 documents fallback (reuse an existing local upload of a real JPEG) — still must show **distinct** images.  
- Promoting console product logs to server funnel — out of scope.

---

## Agent 1 brief

1. Read this handoff + `STORY_03_validation_testing.md`.  
2. Implement `seed-sprint41-validation.ts` (+ cleanup) and verify script; local DB + local photos only.  
3. Write `TEST_PROFILES.md` and empty/template `VALIDATION_RESULTS.md`.  
4. Confirm Viewer A list: 10 matches, tiers 2 HIGH / 4 GOOD / 4 OTHER.  
5. No UI product changes; no threshold / engine changes.

**Next command:**

```text
--agent 1 sprint 41 story 3
```
