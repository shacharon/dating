# QA50 pool — local Israel match fixtures

**Prefix:** `qa50_*` — **safe to delete**. Never production.  
**Sprint:** [sprint-qa-local-pool](./README.md) Story 1.

---

## Commands

```bash
cd dating-api
npm run seed:qa50
npm run verify:qa50

# wipe only qa50_* (real users + s41val_* untouched)
npm run seed:qa50 -- --cleanup
```

Requires local `DATABASE_URL`, `SESSION_SECRET_PEPPER`, local photo storage (not S3).

---

## Shape

| Item | Value |
|------|-------|
| Profiles | 50 ANALYZED |
| Gender | 25 MALE / 25 FEMALE (seek opposite) |
| Cities | Tel Aviv, Jerusalem, Haifa, Beer Sheva, Eilat, Herzliya, Rishon LeZion, Netanya |
| Interests | All 24 enrichment codes; 3 tags/profile |
| Ages | ~22–45 |
| Photos | Solid-color APPROVED PNGs (placeholders) |
| Matches | **Story 2** — not seeded here |

---

## Viewer cookies (`dating_session`)

| Key | Persona | Cookie value |
|-----|---------|--------------|
| v01 | Male ~30, Tel Aviv, seeking F, kids YES | `qa50-viewer-v01-session-token-fixed-01` |
| v02 | Female ~28, Haifa, seeking M, kids YES | `qa50-viewer-v02-session-token-fixed-01` |
| v03 | Male ~38, Jerusalem, seeking F, UNSURE | `qa50-viewer-v03-session-token-fixed-01` |
| v04 | Female ~33, Beer Sheva, seeking M, kids NO | `qa50-viewer-v04-session-token-fixed-01` |

1. Set cookie on `localhost` UI origin.  
2. Open `/dating/me-matches`.  
3. List may be empty until Story 2 ranks/backfill.

---

## Do not

- Run cleanup against prod  
- Delete non-`qa50_` users  
- Commit `uploads/profile-photos/qa50_*` (gitignored under `/uploads`)  
- Expect Smart Triage sections until Story 2
