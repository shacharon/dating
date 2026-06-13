# Local development (API + UI)

## Root cause of `ECONNREFUSED 127.0.0.1:3001`

The UI (port **3000**) proxies browser requests from `/api/*` to dating-api on **127.0.0.1:3001** (`dating-ui/next.config.ts` → `API_PROXY_TARGET`).

That error means **nothing is listening on 3001 yet** (or the API restarted):

| Cause | What happens |
|-------|----------------|
| UI started before API | Nest still compiling (~10–30s on first run) |
| API `nest start --watch` restart | Brief downtime on every save |
| API crash on boot | DB migrate, bad env, Redis hang (see below) |
| Only UI running | API never started |

The browser auth check (`GET /api/v1/auth/me`) hits the proxy immediately — Next logs `Failed to proxy` for each attempt.

## Recommended: one command from repo root

```powershell
cd c:\dev\piza\dating
npm install          # once — installs concurrently at root
npm run dev          # API + wait + UI
```

First run with migrations:

```powershell
npm run dev:ready    # prisma migrate deploy, then API + UI
```

## Two terminals (manual)

**Terminal 1 — API first:**

```powershell
cd dating-api
npm run start:dev:ready
```

Wait until you see `Application is running on: http://127.0.0.1:3001`.

**Terminal 2 — UI** (waits for `/health` automatically):

```powershell
cd dating-ui
npm run dev:webpack
```

UI-only without API (will fail after 120s unless you skip wait):

```powershell
$env:SKIP_API_WAIT="1"; npm run dev:nowait
```

## Ports and env

| Service | Port | Env |
|---------|------|-----|
| dating-ui | 3000 | `dating-ui/.env.local` |
| dating-api | 3001 | `dating-api/.env` (`PORT=3001`) |

Proxy target override: `API_PROXY_TARGET=http://127.0.0.1:3001` when starting Next.

Health check used by wait script: `http://127.0.0.1:3001/health`

## Performance (slow routes in dev)

### Why the **first** open is slow, then fast

Measured on this machine (2026-06-13):

| Phase | Typical time | What you see |
|-------|----------------|--------------|
| Nest `start:dev` compile | **~24s** | API not on 3001 yet |
| Next `Ready` | **~12s** | UI terminal still starting |
| First route compile (webpack) | **6–16s** per route | Browser spinner; terminal shows `compile: …s` |
| Repeat same route | **<1s** | Cached — feels normal |

**After the first visit to each route, speed is normal.** That matches “first site takes forever, then OK”.

Warm check (API + UI already running): `/` ~0.5s, redirects ~0.03s.

### What we fixed in the app

- **Landing `/`** — no longer waits for `auth/me` before showing the Google button when there is **no session cookie** (new visitors).
- **Protected routes** — if cookie exists, page renders while session syncs (not a full loading wall).
- **Background auth refresh** — no longer blocks the whole shell.

### Dev tips

1. **Start both together:** `npm run dev` from repo root (waits for API once, then UI).
2. **Prefer turbopack** if stable: `cd dating-ui && npm run dev` (faster first compile than webpack).
3. **Webpack** (`dev:webpack`) — slower first compile but more stable on Windows.
4. **Do not restart UI** unless needed — keeps compile cache.

### Auth / API still slow when

- Nothing on port **3001** — start API first or use root `npm run dev`.
- **`EADDRINUSE:3001`** — API already running; do not start a second `start:dev`.

---

If `REDIS_URL` is set but Redis is not running, the API **still starts** (single-instance socket mode). Unset `REDIS_URL` in local `.env` if you do not need multi-instance WS.

## Residual noise during API watch restarts

When you save API files, `nest --watch` restarts and you may see a **few** proxy errors in the UI terminal for ~5–15s. The UI retries auth automatically. To avoid: restart UI after large API changes, or use root `npm run dev` so both restart together.
