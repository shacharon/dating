# Story 03 — Fake 3–4 QA logins + operator guide

**Sprint QA local pool · Status: Planned**  
**Priority:** P1 (after pool + matches work)  
**Estimated effort:** 0.25 day  
**Dependencies:** Stories 1–2  
**Repo:** `dating-api` docs + seed session rows  
**Handoffs:** `handoffs/STORY_03_qa50_fake_logins/agent-*.md`

---

## Objective

Give you **3–4 one-click-ish fake logins** into different QA viewer personas (without Google OAuth), so you can feel the list from different genders/ages/cities.

---

## Target

| Viewer | Persona sketch (Agent 0 locks) | Cookie |
|--------|--------------------------------|--------|
| QA Viewer 1 | e.g. Male ~30, Tel Aviv, seeking F | `qa50-viewer-1-session-…` |
| QA Viewer 2 | e.g. Female ~28, Haifa, seeking M | `qa50-viewer-2-session-…` |
| QA Viewer 3 | e.g. Male ~38, Jerusalem | `qa50-viewer-3-session-…` |
| QA Viewer 4 | optional 4th | `qa50-viewer-4-session-…` |

Mechanics (same as `s41val_`):
1. `UserSession` with hashed token (`SESSION_SECRET_PEPPER`)
2. Browser cookie `dating_session=<raw>`
3. Tokens printed by seed + listed in `QA50_POOL.md`

---

## Scope / Tasks

### Agent 0
1. Lock 3 vs 4 viewers and personas (must be list-ready: photo + ANALYZED).
2. Lock operator steps (DevTools cookie vs curl).

### Agent 1
1. Ensure seed creates sessions for those viewers.
2. Finish `QA50_POOL.md`: cookies, seed/cleanup/backfill/verify, “real users untouched”.
3. Optional: tiny script `print-qa50-cookies.ts`.

### Agent 2
1. Tokens stable + re-seed safe; cleanup removes sessions.
2. Docs don’t leak into prod instructions.

### Agent 3
1. Log in as 2+ viewers; confirm different list flavors.
2. ACCEPT sprint if Stories 1–2 already green.

---

## Acceptance Criteria

- [ ] 3–4 fixed session cookies documented and working locally  
- [ ] Operator guide complete  
- [ ] Cleanup removes QA sessions with the rest of `qa50_*`  

---

## Suggested Commit

```
test(qa): add qa50 fake viewer sessions and operator guide

Sprint QA local pool Story 3
```
