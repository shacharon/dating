# Handoff: Agent 0 — Architect — Sprint QA pool Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_qa50_fake_logins.md](../../STORY_03_qa50_fake_logins.md)  
**Sprint:** sprint-qa-local-pool  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Operator-guide polish. **Sessions already exist from Story 1 — do not invent new token formats.** **Skip Agent 4.**  
**Repos:** Docs (+ optional tiny print script). No product UI.

---

## Summary

Stories 1–2 already ship **4** list-ready QA viewers with fixed `dating_session` tokens and demo ranks. Story 3 **locks all 4** (not 3) and finishes a **copy-paste operator guide** so you can fake-login quickly and see different list flavors (M vs F). Agent 1 upgrades `QA50_POOL.md` + optional `npm run qa50:cookies`; no re-architecture of seed/ranks.

---

## Baseline (already shipped)

| Item | Status |
|------|--------|
| Viewers v01–v04 | Seeded + sessions (Story 1) |
| Tokens | `qa50-viewer-v0N-session-token-fixed-01` (not `viewer-1`) |
| Ranks | `npm run qa50:ranks` demo (Story 2) |
| Partial docs | `QA50_POOL.md` has cookie table |

---

## Decision: viewers (locked) — all 4

| Key | Gender | Age≈ | City | Seeking | Kids | Cookie |
|-----|--------|------|------|---------|------|--------|
| **v01** | MALE | 30 | Tel Aviv | F | YES | `qa50-viewer-v01-session-token-fixed-01` |
| **v02** | FEMALE | 28 | Haifa | M | YES | `qa50-viewer-v02-session-token-fixed-01` |
| **v03** | MALE | 38 | Jerusalem | F | UNSURE | `qa50-viewer-v03-session-token-fixed-01` |
| **v04** | FEMALE | 33 | Beer Sheva | M | NO | `qa50-viewer-v04-session-token-fixed-01` |

**Reject:** renaming tokens to `qa50-viewer-1-…` (would break existing seeds). Keep **v01–v04** IDs.

Expected list flavor:

| Viewer | Opposite pool | Notes |
|--------|---------------|-------|
| v01, v03 | ~25 female qa50 | Same demo score cycle; different persona context |
| v02, v04 | ~25 male qa50 | Opposite gender cards |

---

## Decision: operator login steps (locked)

### A. Browser (primary)

1. `npm run seed:qa50` (if needed) → `npm run qa50:ranks` → `npm run verify:qa50-matches -- --assert-demo`  
2. Start UI + API locally.  
3. Open UI origin (e.g. `http://localhost:3000`).  
4. DevTools → Application → Cookies → select UI host → add/set:
   - Name: `dating_session` (or `SESSION_COOKIE_NAME` if customized)
   - Value: one of the four raw tokens above  
   - Path: `/`  
5. Navigate to `/dating/me-matches` (hard refresh if needed).  
6. Expect HIGH / GOOD / OTHER with ~25 cards (demo ranks).

### B. API smoke (secondary)

```bash
curl -s -H "Cookie: dating_session=qa50-viewer-v01-session-token-fixed-01" \
  "http://127.0.0.1:3001/api/v1/me/matches?limit=30"
```

Expect `"status":"ready"` and `"matches"` length ~25.

### C. Switch viewer

Clear or overwrite `dating_session`, set another token, refresh `/dating/me-matches`.

### Troubleshooting (document in guide)

| Symptom | Check |
|---------|--------|
| 401 / logged out | Pepper mismatch — re-run `seed:qa50` with same `.env` as API |
| `not_ready` / empty | Re-run `qa50:ranks`; confirm APPROVED photos |
| Wrong user | Cookie on wrong host/port (UI vs API origin) |
| Solid-color photos | Expected for QA |

---

## Decision: Agent 1 scope (locked)

| Do | Don’t |
|----|-------|
| Expand `QA50_POOL.md` into full operator guide (steps A–C + troubleshooting + “real users untouched”) | Change token strings |
| Optional `scripts/print-qa50-cookies.ts` + `npm run qa50:cookies` printing the 4 tokens from fixtures | New Nest endpoints / UI login page |
| Confirm seed still upserts sessions (already true — spot-check only) | New 5th viewer |
| Note Story 41 `s41val_` cookies are separate | Prod/staging instructions |

---

## Decision: cleanup (already locked Story 1)

`npm run seed:qa50 -- --cleanup` removes qa50 sessions with the rest of `qa50_*`. Agent 1 documents that explicitly in the guide.

---

## Acceptance mapping

| AC | How |
|----|-----|
| 3–4 fixed cookies documented + working | All **4** in guide; Agent 3 smokes ≥2 |
| Operator guide complete | Expanded `QA50_POOL.md` |
| Cleanup removes QA sessions | Documented + Story 1 cleanup |

---

## Agent 1 brief

1. Read this handoff + Story 03.  
2. Polish `QA50_POOL.md` (full login + switch + troubleshoot).  
3. Optional `qa50:cookies` print script.  
4. No token/ID renames; no product UI.

**Next command:**

```text
--agent 1 sprint qa-pool story 3
```
