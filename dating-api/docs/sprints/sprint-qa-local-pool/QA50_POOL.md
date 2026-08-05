# QA50 pool — operator guide (local only)

**Prefix:** `qa50_*` — **safe to delete**. Never production / staging.  
**Sprint:** [sprint-qa-local-pool](./README.md)

Use your **real** Google login for day-to-day Smart Triage QA (Story 4). Fake `qa50-viewer` cookies (Story 3) stay available but are **parked**.

---

## Quick start — real me (Story 4)

```bash
cd dating-api

npm run seed:qa50
npm run verify:qa50
npm run qa50:ranks-real -- --email=you@example.com
npm run verify:qa50-real -- --email=you@example.com --assert-demo
```

Then log in as that user in the UI → `/dating/me-matches`.

Example local operator email: `shacharon@gmail.com` (replace with yours).

Or set env once:

```bash
# PowerShell
$env:QA50_REAL_VIEWER_EMAIL="you@example.com"
npm run qa50:ranks-real
npm run verify:qa50-real -- --assert-demo
```

**Cleanup (only `qa50_*` — real user untouched):**

```bash
npm run seed:qa50 -- --cleanup
```

---

## Commands reference

| Command | Purpose |
|---------|---------|
| `npm run seed:qa50` | Upsert 50 profiles + photos (≥1 synthetic each) + 4 viewer sessions |
| `npm run verify:qa50` | Pool shape (gender, cities, interests, photos, sessions) |
| `npm run qa50:ranks-real -- --email=…` | **Story 4:** demo ranks for one real viewer → qa50 candidates |
| `npm run verify:qa50-real -- --email=… --assert-demo` | ≥5 qa50 ranks + ≥2 tiers; non-qa50 ranks preserved |
| `npm run qa50:ranks` | Demo ranks for fake viewers v01–v04 only |
| `npm run verify:qa50-matches -- --assert-demo` | Fake-viewer match AC |
| `npm run qa50:cookies` | Print fake viewer tokens (parked) |
| `npm run seed:qa50 -- --cleanup` | Delete only `qa50_*` rows + local photos |

Requires local `DATABASE_URL`, `SESSION_SECRET_PEPPER` (same as running API), local photo storage (**not** S3).

### Rank safety (real viewer)

`qa50:ranks-real` only deletes/replaces ranks where `candidateProfileId` starts with `qa50_`. Your existing matches to real / `s41val_` profiles stay.

### Avoid for day-to-day QA

```bash
npm run match-list:backfill-ranks   # needs Redis; rebuilds ALL list-ready viewers
```

Prefer `qa50:ranks-real` for your account, or `qa50:ranks` for fake viewers.

---

## Photos

Each `qa50_*` profile has **≥1 APPROVED** local synthetic PNG (gradient / abstract portrait — not a real face). Enough for photo-first browse.

---

## Parked: fake logins (Story 3)

| Key | Persona | Cookie value (`dating_session`) |
|-----|---------|----------------------------------|
| **v01** | Male ~30, Tel Aviv → F, kids YES | `qa50-viewer-v01-session-token-fixed-01` |
| **v02** | Female ~28, Haifa → M, kids YES | `qa50-viewer-v02-session-token-fixed-01` |
| **v03** | Male ~38, Jerusalem → F, UNSURE | `qa50-viewer-v03-session-token-fixed-01` |
| **v04** | Female ~33, Beer Sheva → M, kids NO | `qa50-viewer-v04-session-token-fixed-01` |

```bash
npm run qa50:ranks
npm run qa50:cookies
# DevTools → dating_session=<token> on UI origin → /dating/me-matches
```

Do **not** rename tokens.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Real list still ~1 match | Run `qa50:ranks-real -- --email=…` then hard-refresh |
| 401 / logged out (fake cookie) | Pepper mismatch — re-seed with same `.env` as API |
| Empty / `not_ready` | Viewer needs ANALYZED + own APPROVED photo; re-run ranks |
| Only OTHER / no sections | Use demo mode (default), not `--engine` |
| Afraid of deleting real users | Cleanup only deletes `qa50_*` catalog IDs |

---

## Pool shape

| Item | Value |
|------|-------|
| Profiles | 50 ANALYZED |
| Gender | 25 M / 25 F |
| Cities | Tel Aviv, Jerusalem, Haifa, Beer Sheva, Eilat, Herzliya, Rishon LeZion, Netanya |
| Interests | All 24 enrichment codes; 3 tags/profile |
| Demo rank scores | Cycle `92,88,80,76,72,62,55,48` |
| Photos | ≥1 synthetic APPROVED PNG each |

---

## Related fixtures

| Prefix | Purpose |
|--------|---------|
| `qa50_*` | This QA volume pool |
| `s41val_*` | Sprint 41 Smart Triage validation (separate) |

Do not mix cookies across fixtures.
