# Story 03 — Offline Handling / Retry UX

**Sprint:** FE-06  
**Effort:** ~6–8 hours  
**Risk:** 🟢 LOW (TanStack Query defaults + UI banner; no backend)  
**Status:** Done  
**GO_LIVE:** Frontend #7 (mobile graceful offline)  
**Depends on:** FE-05 Done; FE-06 Stories 1–2 (`feature/fe-sprint-06-story-2` @ `b4c9198`)

**Handoffs:** [preflight](./handoffs/STORY_03_offline_handling/agent--1-preflight.md) · [architect](./handoffs/STORY_03_offline_handling/agent-0-architect.md) · [dev](./handoffs/STORY_03_offline_handling/agent-1-dev.md) · [CR](./handoffs/STORY_03_offline_handling/agent-2-cr.md) · [PM](./handoffs/STORY_03_offline_handling/agent-3-pm.md)

---

## Objective

Improve mobile/Capacitor UX when the network is unavailable: **visible offline state**, **smarter query retries**, and **automatic refetch on reconnect** — without changing backend APIs or messaging socket logic.

**Deliverable:** `query-retry.ts` + `use-online-status.ts` + `OfflineBanner` + updated global QueryClient defaults.

---

## Problem (before)

```text
create-app-query-client.ts  → retry: 1 (always, even offline)
navigator.onLine            → unused
UI                          → no offline indicator
auth bootstrap              → separate retry (auth-api.ts) — keep as-is
messaging socket            → separate reconnect — keep as-is
```

---

## Solution

- **`query-retry.ts`** — `shouldRetryQuery`, `queryRetryDelay`; skip retry when offline or 4xx (incl. 401/403)
- **`create-app-query-client.ts`** — wire retry fn, `networkMode: 'online'`, `refetchOnReconnect: true`; `mutations.retry: false`
- **`use-online-status.ts`** — `window` `online`/`offline` listeners + `navigator.onLine`
- **`OfflineBanner`** — thin amber bar in authenticated chrome; `role="status"` + `aria-live="polite"`
- **i18n** — `appShell.offlineBanner` (en/he/es)

**No `@capacitor/network`** in Story 3 — `navigator.onLine` works in Capacitor WebView.

---

## Out of scope (Story 3)

- Backend / API changes
- Offline mutation queue / send-when-online
- Messaging socket reconnect changes
- `@capacitor/network` plugin
- Public landing offline banner (authenticated product only)
- Persistent offline cache / `offlineFirst` mode
- iOS-specific network APIs

---

## Success criteria

- [x] Global queries skip retry when `navigator.onLine === false`
- [x] Queries do not retry on 401/403/404 or other 4xx
- [x] Transient failures retry up to 2 times with exponential backoff (max 30s)
- [x] `refetchOnReconnect: true` — stale active queries refetch when back online
- [x] Mutations default `retry: false`
- [x] Offline banner visible in authenticated shell when offline; hidden when online
- [x] Unit tests green (28 story-scoped)
- [x] Full Vitest green; Agent 2 CR approved (Agent 2.5 N/A; Agent 3.5 for banner a11y)

---

## How to verify

```bash
cd dating-ui
git checkout feature/fe-sprint-06-story-3
npm test -- src/lib/query-retry.spec.ts src/lib/use-online-status.spec.ts src/components/offline-banner.spec.tsx src/lib/create-app-query-client.spec.ts
npm test
npm run build
npm run build:capacitor
```

DevTools → Network → **Offline** → banner appears; navigate → queries fail without retry storm. Go **Online** → banner hides; data refetches.

---

## Files changed

**New:**
- `src/lib/query-retry.ts` + spec (9 tests)
- `src/lib/use-online-status.ts` + spec (4 tests)
- `src/components/offline-banner.tsx` + spec (2 tests)

**Modified:**
- `src/lib/create-app-query-client.ts` + spec — offline-aware defaults, `mutations.retry: false`
- `src/components/authenticated-app-shell.tsx` — mount `OfflineBanner`
- `src/components/authenticated-app-shell.spec.tsx` — offline banner integration
- `src/lib/i18n/{en,he,es,types}.ts` — `appShell.offlineBanner`

**Not changed:** `auth-api.ts`, `authenticated-fetch.ts`, `use-messaging-socket.ts`, dating-api.

---

## Known limitations

- `navigator.onLine` may report online without real connectivity
- Mutations fail immediately offline (no queue)
- DevTools/device offline QA deferred to Agent 3.5
- Backend / FE-05 not on `main` — branch-stack until merge

---

## Branch

`feature/fe-sprint-06-story-3` from `feature/fe-sprint-06-story-2` (`b4c9198`) — ready for PR/merge; completes FE-06 stack
