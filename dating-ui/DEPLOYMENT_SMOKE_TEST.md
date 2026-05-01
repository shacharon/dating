# Legacy Matches UI Removal — deployment smoke

**Prepared:** 2026-04-19  
**Change:** Legacy UI removed; `/dating/matches` redirects to `/dating/me-matches`  
**Scope:** This repository does **not** define cloud staging or production hostnames. The values below are the **only reproducible “deployment” surface encoded in-repo**: local machines running the commands from `dating-ui/package.json` and `dating-api/package.json`.

---

## Source of truth (in-repo)

| File | Role |
|------|------|
| `dating-ui/next.config.ts` | Rewrites `/api/:path*` → `${API_PROXY_TARGET}/api/:path*` (default `http://localhost:3001`) |
| `dating-ui/src/lib/api-base.ts` | Empty `NEXT_PUBLIC_API_URL` → browser uses same-origin `/api/...` |
| `dating-ui/.env.example` | Documents `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_API_URL` |
| `dating-ui/package.json` | `dev`, `build`, `start` |
| `dating-api/package.json` | `build`, `start:dev`, `start:prod` |
| `dating-api/src/main.ts` | Listens on `PORT` from config, default **3001** |

**Active path vs legacy path**

- **Active UI/API:** `/dating/me-matches` → `GET /api/v1/me/matches` (auth; `UserProfile` + `UserProfileEvaluation`)
- **Legacy UI:** `/dating/matches` → server redirect to `/dating/me-matches`
- **Legacy API (still exposed where not removed):** `GET /api/v1/matches` (list/detail/compare where not removed; POC list uses `GET /api/matches` instead)

---

## Deployment target (canonical local verification)

There are **no** staging or production **URLs** checked into this repository for the dating stack. The table below fixes **local** hosts and commands so smoke tests and “deploy” rehearsal are unambiguous.

| Field | Value |
|-------|--------|
| **Staging-equivalent UI base URL** | `http://127.0.0.1:3000` (`npm run dev` — Turbopack) |
| **Production-mode UI base URL** | `http://127.0.0.1:3000` (`npm run build` then `npm run start` — same port, production build) |
| **API topology** | **Same-origin for the browser** when `NEXT_PUBLIC_API_URL` is unset: UI origin + path `/api/...`, rewritten to dating-api. |
| **API direct origin (dating-api)** | `http://127.0.0.1:3001` (matches default `PORT` / `API_PROXY_TARGET`) |
| **Smoke curl base for `/api/*`** | Use **UI origin** `http://127.0.0.1:3000` so requests exercise the same rewrite path as the browser: `http://127.0.0.1:3000/api/v1/...` |

### Exact deploy commands (local rehearsal — not cloud deploy)

Run from repository root `bondit_webapp` (adjust if your shell uses different path separators).

**1) API (Terminal A)**

```bash
cd src/find/dating/dating-api
npm install
npm run build
npm run start:prod
```

**2) UI (Terminal B)** — set rewrite target so Next can reach the API:

```bash
# Bash / Git Bash / WSL
export API_PROXY_TARGET=http://127.0.0.1:3001

cd src/find/dating/dating-ui
npm install
npm run build
npm run start
```

PowerShell (same intent):

```powershell
$env:API_PROXY_TARGET = "http://127.0.0.1:3001"
Set-Location src/find/dating/dating-ui
npm install
npm run build
npm run start
```

**Staging-style dev** (faster iteration, same ports): Terminal A `npm run start:dev` (API), Terminal B `npm run dev` (UI). Optional: same `API_PROXY_TARGET` if you rely on `/api` rewrites in dev.

### Exact rollback commands (code revert + rerun)

After `git revert <commit-hash>` for the legacy-UI removal (or any rollback commit):

```bash
cd src/find/dating/dating-api && npm run build && npm run start:prod
```

```bash
export API_PROXY_TARGET=http://127.0.0.1:3001
cd src/find/dating/dating-ui && npm run build && npm run start
```

Rollback restores prior UI behavior once the reverted code is back on disk; **no database migration** is involved for this slice.

---

## Repository infrastructure audit

- **Present:** Local dev/prod-style scripts for `dating-ui` and `dating-api`; Next rewrites; `getApiBase()` behavior.
- **Absent in-repo:** Hosted staging/production base URLs, cloud CI/CD definitions for the dating app, container image publish steps specific to dating-ui. The root `docker/pipeline.sh` targets the **Angular** app, not Next.js dating-ui.

If your organization later adds cloud URLs, record them in your internal runbook; **do not** assume they exist in this file until added by the team.

---

## Validation command (pre-commit)

```bash
cd src/find/dating/dating-ui && npm run build
cd src/find/dating/dating-api && npm run build
```

**Exit criteria:** both builds succeed.

---

## Automated smoke script

From `dating-ui/`:

```bash
chmod +x smoke-test.sh
# Same-origin API via Next rewrites (matches table above)
./smoke-test.sh http://127.0.0.1:3000
```

Optional second argument only if you intentionally test a **split** API origin (browser would use `NEXT_PUBLIC_API_URL` to that host):

```bash
./smoke-test.sh http://127.0.0.1:3000 http://127.0.0.1:3001
```

On Windows, use Git Bash, WSL, or translate the `curl` calls with `Invoke-WebRequest`.

---

## Post-deploy smoke checklist (local stack)

Set `DOMAIN=http://127.0.0.1:3000` and `API_BASE=http://127.0.0.1:3000` for same-origin `/api` checks.

| Step | Action | Pass |
|------|--------|------|
| 1 | `curl -sI --max-redirs 0 "$DOMAIN/dating/matches"` | 302/307/200, not 404/500 |
| 2 | Browser: `$DOMAIN/dating/me-matches` | 200, no blank screen |
| 3 | Browser: `$DOMAIN/dating/me-matches/<id>` (real id) | 200, data loads |
| 4 | `curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/api/v1/me/matches"` | 401 or 200 |

**Note:** Steps 4-5 removed (2026-04-24): `/poc/matches` and `GET /api/matches` deleted per Decision Gate 0 (Option C).

---

## Post-deploy monitoring (optional)

If you add centralized HTTP or APM logs later, watch 4xx/5xx on `/dating/matches`, `/dating/me-matches`, and `LEGACY_MATCHES_API_CALLED` if legacy API routes are still exposed.

---

## Rollback evidence log (use when an incident occurs)

| Field | Value |
|-------|--------|
| Date/time | |
| Reason | |
| Failed test | |
| Rollback commit | |
| Verification | |

---

## Next phases (out of scope here)

Legacy API / Prisma / table removal stays blocked until product and evidence gates are met.
