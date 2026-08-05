# QA50 pool — local Israel match fixtures

**Prefix:** `qa50_*` — **safe to delete**. Never production.  
**Sprint:** [sprint-qa-local-pool](./README.md)

---

## Commands

```bash
cd dating-api

# Story 1 — profiles
npm run seed:qa50
npm run verify:qa50

# Story 2 — match ranks for v01–v04 (demo scores = default AC path)
npm run qa50:ranks
npm run verify:qa50-matches -- --assert-demo

# Optional: engine scores (sync compare; no Redis)
npm run qa50:ranks -- --engine
npm run verify:qa50-matches

# wipe only qa50_* (real users + s41val_* untouched)
npm run seed:qa50 -- --cleanup
```

Requires local `DATABASE_URL`, `SESSION_SECRET_PEPPER`, local photo storage (not S3).

### Global Bull backfill (optional — avoid for day-to-day QA)

```bash
npm run match-list:backfill-ranks
```

Needs `REDIS_URL` + worker. Enqueues **all** list-ready viewers on the DB (real + s41val + qa50). Prefer `npm run qa50:ranks` instead.

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
| Demo ranks | Cycle `92,88,80,76,72,62,55,48` → HIGH/GOOD/OTHER |

---

## Viewer cookies (`dating_session`)

| Key | Persona | Cookie value |
|-----|---------|--------------|
| v01 | Male ~30, Tel Aviv, seeking F, kids YES | `qa50-viewer-v01-session-token-fixed-01` |
| v02 | Female ~28, Haifa, seeking M, kids YES | `qa50-viewer-v02-session-token-fixed-01` |
| v03 | Male ~38, Jerusalem, seeking F, UNSURE | `qa50-viewer-v03-session-token-fixed-01` |
| v04 | Female ~33, Beer Sheva, seeking M, kids NO | `qa50-viewer-v04-session-token-fixed-01` |

1. Run `qa50:ranks` (demo).  
2. Set cookie on `localhost` UI origin.  
3. Open `/dating/me-matches` — expect ~25 cards in HIGH / GOOD / OTHER sections.

---

## Do not

- Run cleanup against prod  
- Delete non-`qa50_` users  
- Commit `uploads/profile-photos/qa50_*` (gitignored under `/uploads`)  
- Use global `match-list:backfill-ranks` when you only want qa50 (it rebuilds everyone)
