# Operational scripts (supported)

Last updated: Sprint 7 Story 2 (2026-06-03).

## npm scripts (product / CI)

| Script | Purpose |
|--------|---------|
| `npm test` | Full Jest suite |
| `npm run smoke:auth` | Auth + session integration smokes |
| `npm run smoke:me-profile` | Me profile HTTP smoke |
| `npm run smoke:matches` | Legacy admin matches API smoke |
| `npm run smoke:ws` | Realtime messaging WebSocket integration |
| `npm run smoke:ws-preflight` | WS env/connectivity preflight (`scripts/smoke-ws-preflight.ts`) |
| `npm run validate:new-model-e2e` | New-model me/matches E2E Jest |
| `npm run validate:phase2-me-profile` | Me profile unit + HTTP contract bundle |
| `npm run holy-grail:backfill` | HG structured backfill (`src/holy-grail-matching/`) |
| `npm run phase-f:expand-analyzed` | Phase F profile expansion (`scripts/phase-f-expand-analyzed-profiles.ts`) |
| `npm run verify:personality-traits` | Personality traits E2E verify script |

## ts-node scripts (common)

| File | Purpose |
|------|---------|
| `scripts/validate-phase4-matching.ts` | Two-user new-model match path via Nest app context |
| `scripts/truncate-all-tables.ts` | Dev DB reset (no legacy tables) |
| `scripts/smoke-ws-preflight.ts` | WS preflight (also via npm) |

Reanalyze, audit, and seed utilities under `scripts/` remain for operators; they must not reference `MatchmakingProfile`.

## Phase F (partner preferences)

- **Product home:** `UserProfilePreference` (`prisma/schema.prisma`)
- **Gender bridge:** `UserProfile.desiredPartnerGenders` JSON until a later phase
- **Migration:** `prisma/migrations/20260502103000_phase_f_drop_user_profile_preference_columns/`

## Retired tooling

MatchmakingProfile-era scripts live under `scripts/archive/retired-matchmaking-profile/` — **do not run**.

## Build output

`npm run build` writes to `dating-api/dist/`. That directory is gitignored (`/dist` in `.gitignore`); it should not appear as tracked files in `git status`.
