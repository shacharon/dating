# Test Profiles — Sprint 41 Story 3

Synthetic local-only fixtures (`s41val_*`). Seeded by:

```bash
cd dating-api
npm run seed:sprint41-validation
npm run verify:sprint41-validation
```

Cleanup: `npm run seed:sprint41-validation -- --cleanup`

**Do not use in production.**

---

## Viewer profiles

### Viewer A (primary protocol)

| Field | Value |
|-------|-------|
| Name | Alex Rivera |
| User ID | `s41val_user_viewer_a` |
| Profile ID | `s41val_prof_viewer_a` |
| Gender / seeking | Male → Female |
| Age | ~32 (birth 1994-03-12) |
| Wants children | YES |
| Interests | tech, hiking, cooking, travel |
| Session cookie (`dating_session`) | `s41val-viewer-a-session-token-fixed-01` |

### Viewer B (optional / gender sanity)

| Field | Value |
|-------|-------|
| Name | Jordan Lee |
| User ID | `s41val_user_viewer_b` |
| Profile ID | `s41val_prof_viewer_b` |
| Gender / seeking | Female → Male |
| Age | ~29 (birth 1997-07-22) |
| Wants children | YES |
| Interests | design, yoga, museums, cooking |
| Session cookie (`dating_session`) | `s41val-viewer-b-session-token-fixed-01` |

---

## Candidate profiles (Viewer A pool)

Tier mix locked via `MatchListRank`: **2 HIGH / 4 GOOD / 4 OTHER**.

| # | Name | Age | Score | Tier | Wants kids | Industry | Notes |
|---|------|-----|-------|------|------------|----------|-------|
| 1 | Sarah Chen | 30 | 92 | HIGH | YES | tech | Strong kids + career alignment |
| 2 | Maya Patel | 28 | 88 | HIGH | YES | product | Shared travel/cooking interests |
| 3 | Rachel Kim | 31 | 78 | GOOD | YES | creative | Partial overlap |
| 4 | Nina Alvarez | 29 | 76 | GOOD | UNSURE | outdoors | Hiking overlap |
| 5 | Lena Brooks | 32 | 74 | GOOD | YES | education | Values family dinners |
| 6 | Ava Nguyen | 27 | 72 | GOOD | UNSURE | tech | Startup energy |
| 7 | Dana Morris | 27 | 62 | OTHER | UNSURE | fashion | Attractive OTHER (photo-first test) |
| 8 | Zoe Hart | 28 | 58 | OTHER | NO | outdoors | Clear kids mismatch |
| 9 | Iris Cole | 26 | 52 | OTHER | NO | entertainment | Nightlife mismatch |
| 10 | Quinn Blake | 33 | 48 | OTHER | NO | finance | Career-max mismatch |

Profile IDs: `s41val_prof_cand_f01` … `s41val_prof_cand_f10`.

---

## Candidate profiles (Viewer B pool)

Same score/tier distribution; male names (`s41val_prof_cand_m01` … `m10`). See `scripts/sprint41-validation-fixtures.ts` for full copy.

| Score | Tier | Examples |
|-------|------|----------|
| 92, 88 | HIGH | Noah Kim, Ethan Ruiz |
| 78–72 | GOOD | Liam, Owen, Caleb, Miles |
| 62–48 | OTHER | Jasper (attractive OTHER), Theo, Rex, Victor |

---

## How Agent 3 logs in

1. Start local API + UI with local Postgres.
2. Ensure `MATCH_LIST_MATERIALIZED` is **not** set to `0`/`false`/`no` (default on).
3. Run seed + verify (above).
4. In the browser, set cookie `dating_session` = Viewer A token (or use DevTools Application → Cookies).
5. Open `/dating/me-matches`.
6. Confirm sections: Message these first (2) / Good (4) / Other (4) — scores come from seeded `MatchListRank` on the materialized list path.

During sessions, open DevTools console and filter `match.` for existing product logs (no new persistence).

### Caveats for human sessions

- Placeholder photos are **solid-color PNGs** (distinct hues), not faces. Treat the “HIGH vs 6/10 photo” question as **hypothetical**, or judge relative card appeal by copy + color only.
- Do **not** run `match-list:backfill-ranks` for Viewer A/B during sessions — it can overwrite fixture scores. Re-seed if ranks drift.
- Do **not** commit `uploads/profile-photos/s41val_*` (gitignored).