# Error code registries

Two separate registries exist on purpose. **Do not merge them.**

## `ErrorCodes` (`src/logging/error-codes.ts`)

- **Audience:** server structured logs, domain errors, Sentry `errorCode` tags.
- **Shape:** SCREAMING_SNAKE string values (e.g. `AUTH_GUARD_UNAUTHORIZED`).
- **Stability:** **Never rename** existing values — CloudWatch queries and dashboards depend on them.
- **Add** new keys when a new log/domain path needs a stable code.

## `AUTH_ERROR_CODES` (`src/auth/auth-error-codes.ts`)

- **Audience:** client JSON / query field `auth_error` on auth flows.
- **Shape:** snake_case (e.g. `disabled_user`, `email_in_use`).
- **Stability:** treat as a public client contract; change only with UI coordination.

## Both on one request

`AuthGuard` may use **both** in one flow:

- Log with `ErrorCodes.AUTH_GUARD_UNAUTHORIZED`
- Return body `{ auth_error: AUTH_ERROR_CODES.disabled_user }` for disabled accounts

## Admin deny: body vs log

`AdminGuard` returns HTTP **403** `{ error: 'admin_forbidden' }` (snake — UI/docs contract).

Structured logs use `ErrorCodes.ADMIN_FORBIDDEN` (`ADMIN_FORBIDDEN`). These strings are **not** the same and must not be swapped into the JSON body without a coordinated UI + docs change.

## Process codes

`PROCESS_UNCAUGHT_EXCEPTION` / `PROCESS_UNHANDLED_REJECTION` are process-level `ErrorCodes` (wired from Nest bootstrap). Keep them; they are not auth client codes.
