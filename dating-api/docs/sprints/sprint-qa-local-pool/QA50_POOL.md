# QA50 pool — operator guide (local only)

**Prefix:** `qa50_*` — **safe to delete**. Never production / staging.  
**Sprint:** [sprint-qa-local-pool](./README.md)

Fake logins use fixed `dating_session` cookies (no Google OAuth). Real email users and `s41val_*` fixtures are **separate** and must stay untouched.

---

## Quick start

```bash
cd dating-api

npm run seed:qa50
npm run verify:qa50
npm run qa50:ranks
npm run verify:qa50-matches -- --assert-demo
npm run qa50:cookies
```

Then set a cookie (below) and open `http://localhost:3000/dating/me-matches`.

**Cleanup (only `qa50_*`, including viewer sessions):**

```bash
npm run seed:qa50 -- --cleanup
```

---

## Commands reference

| Command | Purpose |
|---------|---------|
| `npm run seed:qa50` | Upsert 50 profiles + 4 viewer sessions |
| `npm run verify:qa50` | Pool shape (gender, cities, interests, photos, sessions) |
| `npm run qa50:ranks` | Demo MatchListRank for v01–v04 (default AC) |
| `npm run qa50:ranks -- --engine` | Optional sync engine scores (often all OTHER) |
| `npm run verify:qa50-matches -- --assert-demo` | ≥15 ranks + ≥2 tiers per viewer |
| `npm run qa50:cookies` | Print the 4 raw session tokens |
| `npm run seed:qa50 -- --cleanup` | Delete only `qa50_*` rows + local photos |

Requires local `DATABASE_URL`, `SESSION_SECRET_PEPPER` (same as running API), local photo storage (**not** S3).

### Avoid for day-to-day QA

```bash
npm run match-list:backfill-ranks   # needs Redis; rebuilds ALL list-ready viewers
```

Prefer `npm run qa50:ranks`.

---

## Fake logins — 4 viewers

| Key | Persona | Cookie value (`dating_session`) |
|-----|---------|----------------------------------|
| **v01** | Male ~30, Tel Aviv → F, kids YES | `qa50-viewer-v01-session-token-fixed-01` |
| **v02** | Female ~28, Haifa → M, kids YES | `qa50-viewer-v02-session-token-fixed-01` |
| **v03** | Male ~38, Jerusalem → F, UNSURE | `qa50-viewer-v03-session-token-fixed-01` |
| **v04** | Female ~33, Beer Sheva → M, kids NO | `qa50-viewer-v04-session-token-fixed-01` |

| Viewer | List flavor |
|--------|-------------|
| v01, v03 | ~25 **female** qa50 cards (demo HIGH/GOOD/OTHER) |
| v02, v04 | ~25 **male** qa50 cards |

Do **not** rename tokens (breaks existing local seeds).

---

## A. Browser login (primary)

1. Ensure seed + ranks ran (Quick start).  
2. Start API + UI locally.  
3. Open the **UI** origin, e.g. `http://localhost:3000`.  
4. DevTools → **Application** → **Cookies** → select that host → add/edit:
   - **Name:** `dating_session` (unless `SESSION_COOKIE_NAME` is customized)
   - **Value:** one token from the table (or `npm run qa50:cookies`)
   - **Path:** `/`
5. Go to `/dating/me-matches` (hard refresh if the page was already open).  
6. Expect photo-first cards + priority sections (~25 matches after demo ranks).

Photos are **solid-color placeholders** — expected for QA.

---

## B. API smoke (secondary)

```bash
curl -s -H "Cookie: dating_session=qa50-viewer-v01-session-token-fixed-01" \
  "http://127.0.0.1:3001/api/v1/me/matches?limit=30"
```

Expect `"status":"ready"` and about **25** matches with `priorityTier` HIGH/GOOD/OTHER.

---

## C. Switch viewer

1. Overwrite `dating_session` with another token (v02 / v03 / v04).  
2. Refresh `/dating/me-matches`.  
3. Male viewers show women; female viewers show men.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 401 / logged out | `SESSION_SECRET_PEPPER` mismatch — re-run `seed:qa50` with the **same** `.env` the API uses |
| Empty / `not_ready` | Re-run `qa50:ranks`; confirm `verify:qa50` photos PASS |
| Wrong account | Cookie set on wrong host (must be UI origin, e.g. `:3000`) |
| Only OTHER / no sections | Re-run `qa50:ranks` **without** `--engine` (demo mode) |
| Solid-color photos | Expected |
| Afraid of deleting real users | Cleanup only deletes IDs in the `qa50_*` catalog — never real emails / `s41val_*` |

---

## Pool shape (Story 1)

| Item | Value |
|------|-------|
| Profiles | 50 ANALYZED |
| Gender | 25 M / 25 F (seek opposite) |
| Cities | Tel Aviv, Jerusalem, Haifa, Beer Sheva, Eilat, Herzliya, Rishon LeZion, Netanya |
| Interests | All 24 enrichment codes; 3 tags/profile |
| Demo rank scores | Cycle `92,88,80,76,72,62,55,48` |

---

## Related fixtures

| Prefix | Purpose |
|--------|---------|
| `qa50_*` | This QA volume pool |
| `s41val_*` | Sprint 41 Smart Triage validation (separate cookies) |

Do not mix cookies across fixtures.
