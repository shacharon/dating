# dating-ui

Next.js frontend for the dating product. Talks to the NestJS API in sibling package `dating-api`.

## Getting started

```bash
# from dating-ui/
npm install
npm run dev          # http://localhost:3000 (Turbopack)
# or wait for API then start:
npm run dev:safe
```

API is expected on the URL configured in env (see `.env.example` / local `.env`).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack, port 3000) |
| `npm run dev:webpack` | Dev server with webpack |
| `npm run dev:safe` | Wait for API, then `dev` |
| `npm run clean:next` / `dev:fresh` | Clear `.next` then (optionally) restart |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest watch |
| `npm run test:e2e` | Profile hub + redirect smoke specs |

## Routes

Canonical product paths (legacy aliases redirect where noted):

### Public

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Onboarding

| Path | Purpose |
|------|---------|
| `/onboarding` | Onboarding entry |
| `/onboarding/basic` | Step 1 — basics |
| `/onboarding/texts` | Step 2 — story texts |

### Dating app

| Path | Purpose |
|------|---------|
| `/dating/me-matches` | Match list |
| `/dating/me-matches/[id]` | Match detail |
| `/dating/conversations` | Conversation list |
| `/dating/conversations/[id]` | Conversation detail |

### Profile hub

| Path | Purpose |
|------|---------|
| `/profile` | Unified hub (`?tab=overview\|edit\|analysis\|settings`) |

Legacy `/dating/profile`, `/dating/analysis`, and settings profile aliases redirect into the hub.

### Admin

| Path | Purpose |
|------|---------|
| `/admin` | Admin home |
| `/admin/photos` | Photo moderation |
| `/admin/reports` | Reports queue |
| `/admin/content-violations` | Content violations |
| `/admin/match-quality` | Match quality insights |

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for nav shell, profile hub, and detail-page refactor patterns.

Sprint locks and handoffs live under `docs/sprints/`.
