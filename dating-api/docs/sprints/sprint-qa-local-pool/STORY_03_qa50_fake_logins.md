# Story 03 — Fake 3–4 QA logins + operator guide

**Sprint QA local pool · Status: Done**  
**Priority:** P1 (after pool + matches work)  
**Estimated effort:** 0.25 day  
**Dependencies:** Stories 1–2  
**Repo:** `dating-api` docs + seed session rows  
**Handoffs:** `handoffs/STORY_03_qa50_fake_logins/agent-*.md`  
**Architect:** [handoffs/STORY_03_qa50_fake_logins/agent-0-architect.md](./handoffs/STORY_03_qa50_fake_logins/agent-0-architect.md)  
**Dev:** [handoffs/STORY_03_qa50_fake_logins/agent-1-dev.md](./handoffs/STORY_03_qa50_fake_logins/agent-1-dev.md)  
**CR:** [handoffs/STORY_03_qa50_fake_logins/agent-2-cr.md](./handoffs/STORY_03_qa50_fake_logins/agent-2-cr.md)  
**PM:** [handoffs/STORY_03_qa50_fake_logins/agent-3-pm.md](./handoffs/STORY_03_qa50_fake_logins/agent-3-pm.md)

---

## Objective

Give you **3–4 one-click-ish fake logins** into different QA viewer personas (without Google OAuth), so you can feel the list from different genders/ages/cities.

---

## Target

| Viewer | Persona | Cookie |
|--------|---------|--------|
| **v01** | Male ~30, Tel Aviv, seeking F, kids YES | `qa50-viewer-v01-session-token-fixed-01` |
| **v02** | Female ~28, Haifa, seeking M, kids YES | `qa50-viewer-v02-session-token-fixed-01` |
| **v03** | Male ~38, Jerusalem, seeking F, UNSURE | `qa50-viewer-v03-session-token-fixed-01` |
| **v04** | Female ~33, Beer Sheva, seeking M, kids NO | `qa50-viewer-v04-session-token-fixed-01` |

Mechanics (already in Story 1 seed):
1. `UserSession` with hashed token (`SESSION_SECRET_PEPPER`)
2. Browser cookie `dating_session=<raw>`
3. Tokens listed in `QA50_POOL.md` (+ optional `npm run qa50:cookies`)

**Do not rename** tokens (would invalidate existing local seeds).

---

## Scope / Tasks

### Agent 0
1. ✅ Lock **4** viewers v01–v04 (tokens already shipped — keep names)
2. ✅ Lock operator steps: DevTools cookie (primary) + curl smoke + switch/troubleshoot

### Agent 1
1. ✅ Sessions already created in Story 1 — spot-check PASS
2. ✅ Full operator guide in `QA50_POOL.md`
3. ✅ `print-qa50-cookies.ts` + `npm run qa50:cookies`

### Agent 2
1. ✅ Tokens stable + re-seed safe; cleanup removes sessions.
2. ✅ Docs don’t leak into prod instructions.

### Agent 3
1. ✅ Log in as 2+ viewers; confirm different list flavors.
2. ✅ ACCEPT sprint if Stories 1–2 already green.

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Viewer count | **4** (v01–v04) |
| Tokens | Keep existing `qa50-viewer-v0N-session-token-fixed-01` — **no rename** |
| Login UX | DevTools `dating_session` cookie (primary); curl for API smoke |
| New product code | **None** |
| Agent 1 focus | Operator guide polish + optional `qa50:cookies` |

---

## Acceptance Criteria

- [x] 4 fixed session cookies documented and working locally  
- [x] Operator guide complete (login / switch / troubleshoot)  
- [x] Cleanup removes QA sessions with the rest of `qa50_*` (documented)  

---

## Suggested Commit

```
test(qa): add qa50 fake viewer sessions and operator guide

Sprint QA local pool Story 3
```
