# Story 33.4 — Kill Redundant Routes (LOCKED)

**Sprint:** 33 — UX Navigation  
**Story:** 4 — Kill redundant routes  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** Done (PM ACCEPT)  
**Skip Agent 4:** yes

---

## Goal

Remove low-value / legacy route files; keep bookmarks working via **middleware redirects**; send post-login traffic to **Matches**.

---

## Decisions (locked)

### 1. Middleware owns static dating redirects

| From | To | Notes |
|------|-----|--------|
| `/dating` | `/dating/me-matches` | Exact path only (`pathname === '/dating'`) |
| `/dating/matches` | `/dating/me-matches` | Legacy list |
| `/dating/matches/:id` | `/dating/me-matches/:id` | Encode id; ignore trailing junk |

Use `NextResponse.redirect` (307 default is fine; 308 OK if preferred for permanent legacy).

**Do not** put profile API calls in middleware (Edge + API base URL + cookie forwarding risk).

### 2. Delete dating hub UI

| Delete |
|--------|
| `src/app/dating/page.tsx` |
| `src/app/dating/dating-page-client.tsx` |
| `src/app/dating/page.spec.tsx` (replace coverage in `middleware.spec.ts`) |

### 3. Delete legacy matches redirect pages

| Delete |
|--------|
| `src/app/dating/matches/page.tsx` |
| `src/app/dating/matches/[id]/page.tsx` |

Redirects move to middleware (above). Empty `matches/` dirs should be removed if empty.

### 4. `/onboarding` smart resume — keep behavior, slim files

AGENT_COMMANDS suggested always → `/onboarding/basic` in middleware. **Rejected** — would break `onboardingResumePath` (COMPLETED → profile, TEXTS → texts).

**Locked approach:**

- **Keep** route `/onboarding` under `(authenticated)/onboarding/page.tsx`.
- **Delete** `src/components/onboarding-index-redirect.tsx` by **inlining** the same client redirect into that page (or a colocated `onboarding-index-client.tsx` under the route folder — prefer colocate under `app/(authenticated)/onboarding/`).
- Middleware: **no** special `/onboarding` step routing (auth gate only, as today).

### 5. Default post-login / hub links → Matches

| Location | Change |
|----------|--------|
| `public-landing-client.tsx` `DEFAULT_AFTER_LOGIN` | `/dating` → `/dating/me-matches` |
| `(authenticated)/app/page.tsx` | redirect → `/dating/me-matches` |
| `onboarding-basic-form.tsx` (and any `href="/dating"`) | → `/dating/me-matches` |
| Any other internal `href="/dating"` (exact) | → `/dating/me-matches` |

Keep `/dating/onboarding` → `/onboarding` redirect page as-is (useful alias).

### 6. Tests

- Extend `middleware.spec.ts` for the three dating redirects (with session cookie so auth gate passes).
- Update specs that assert `next=/dating` or hub copy if needed.
- Remove/adjust `dating/page.spec.tsx`.

---

## Out of scope

- Removing `/dating/` URL prefix entirely
- Unified `/profile` consolidation (Sprint 35)
- Changing onboarding step machine / `onboardingResumePath` rules
- Admin / public routes

---

## Acceptance criteria

- [x] `/dating` → `/dating/me-matches` (middleware)
- [x] `/dating/matches` → `/dating/me-matches`
- [x] `/dating/matches/:id` → `/dating/me-matches/:id`
- [x] Hub + legacy match page files deleted
- [x] `/onboarding` still smart-resumes via `onboardingResumePath`
- [x] Login default / hub links land on Matches
- [x] Middleware + related tests pass
- [x] No imports of deleted files

---

## Done

PM **ACCEPT** — see [agent-3-pm.md](./handoffs/STORY_04_kill_redundant_routes/agent-3-pm.md).

```
--agent 0 sprint 33 story 5
```
