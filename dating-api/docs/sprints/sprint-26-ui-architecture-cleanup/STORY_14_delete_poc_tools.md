# Story 14: Delete internal POC tooling (replaces "organize under internal")

**Priority:** P2  
**Status:** In progress

## Goal
Delete UI POC / internal-dev tools (prod already 404-gated). Product path `/dating/me-matches` stays.

### Delete UI routes
- `app/profiles/**`
- `app/evaluate/**`
- `app/matches/**` (root compare POC — not dating/me-matches)
- `app/auto-matches/**`
- Optionally keep thin redirects if needed; prefer hard delete

### Delete UI-only libs used solely by POC
- `lib/profiles-api.ts`, `lib/evaluate-api.ts`, `lib/matches-api.ts` (internal)
- `lib/match-decision-display.ts`, `lib/matches-api-list-mapper.ts`
- `lib/profile-chip-extraction*`, `lib/profile-types.ts`, `lib/profile-signal-display.ts` if only POC
- Decision-engine client libs **only if** no other consumers

### Update gates
- `internal-routes-gate.ts` — remove deleted prefixes (or leave harmless)
- middleware matcher cleanup
- specs for gate/middleware

### Do NOT delete
- `/dating/me-matches/**` (product)
- `/admin/**`
- Backend APIs (unless unused — prefer leave API; UI-only delete this story)

## Acceptance
- [ ] POC routes gone
- [ ] Product dating flows intact
- [ ] Tests/build pass for dating-ui
- [ ] Commit
