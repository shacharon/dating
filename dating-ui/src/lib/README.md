# `src/lib/`

Shared FE helpers and API clients — not React components (`src/components/`).

## Folder map

| Path | Owns |
|------|------|
| `api/` | HTTP clients (`me-*`, conversations shim, `api-base`, reports, etc.) |
| `api-sdk/` | Prefer for matches/conversations/profile SDK surface |
| `api-types/` | Shared DTO types |
| `auth/` | Auth API, token storage, session cookie, authenticated fetch |
| `admin/` | Admin APIs + route gates |
| `messaging/` | Conversations UI helpers, sockets, toasts |
| `matches/` | Match display / preferences / enrichment helpers |
| `profile/` | Profile form, completeness, onboarding |
| `platform/` | Capacitor/platform, viewport, realtime mode |
| `query/` | React Query keys / client / retry |
| `moderation/` | Content-moderation error helpers |
| `referral/` | Referral attribution |
| `i18n/` | Locales |
| `observability/` | Product logger / UI error codes |
| `push/` | Push tokens / routing |

## Import rule

Use `@/lib/<domain>/<module>` (e.g. `@/lib/api/api-base`, `@/lib/auth/token-storage`).  
Do **not** dump new modules at `lib/` root.

`api-sdk` is preferred for new match/conversation/profile calls; legacy clients under `api/` remain for existing call sites.
