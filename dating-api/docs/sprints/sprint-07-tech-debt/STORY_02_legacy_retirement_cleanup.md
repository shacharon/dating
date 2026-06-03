# Story 2: Legacy retirement cleanup

**Sprint:** 7  
**Status:** Not started  
**Depends on:** Story 1

---

## Why

Beyond frozen source files, the repo has deprecated npm scripts that immediately `exit(1)`, Phase F migration follow-ups, and documentation referencing retired `MatchmakingProfile` models. Cleaning these up reduces onboarding friction and CI noise.

---

## What

**As a** developer onboarding to the repo  
**I want** no dead scripts, clear migration status, and accurate docs  
**So that** I don't waste time on retired tooling

### Acceptance criteria

- [ ] **Deprecated scripts removed or archived** — `package.json` scripts that `process.exit(1)` with DEPRECATED message deleted or moved to `scripts/archive/` with README
- [ ] **Phase F status documented** — confirm `UserProfilePreference` is sole home for partner prefs; update any stale docs referencing profile columns
- [ ] **LEGACY_RETIREMENT_PLAN.md** — update status slices or archive if complete
- [ ] **dist/ gitignore** — ensure `dating-api/dist/` in `.gitignore`; remove tracked dist artifacts if any
- [ ] **STRONG_FLAG deprecation note** — document in dealbreakers.ts that STRONG_FLAG = PENALTY legacy (optional: migrate severities in code)
- [ ] **Validate scripts** — keep only working smoke/validate scripts; list in package.json README comment or docs
- [ ] **Tests pass** — no script references broken paths

### Out of scope (this story)

- New Prisma migrations (unless orphan columns confirmed safe to drop — architect decides)
- Deleting sprint handoff history

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_02_legacy_retirement_cleanup/agent-0-architect.md` after architect run.

Audit commands for architect:
```bash
grep -r "process.exit(1)" dating-api/scripts/
grep -r "DEPRECATED" dating-api/package.json
```

Phase F reference: `prisma/migrations/20260502103000_phase_f_drop_user_profile_preference_columns/`

---

## Definition of done

- [ ] package.json scripts cleaned
- [ ] .gitignore updated for dist/
- [ ] Legacy retirement doc status updated
- [ ] No DEPRECATED exit(1) scripts in default npm run paths

---

## Manual smoke

1. `npm run smoke:auth` / `smoke:me-profile` / `smoke:matches` — still work if kept  
2. `git status` — no dist/ noise after build  
3. New dev can read docs without hitting retired MatchmakingProfile references

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| STRONG_FLAG → PENALTY migration in code | optional |
| Orphan DB column drop migration | if architect confirms safe |
