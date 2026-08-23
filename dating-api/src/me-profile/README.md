# me-profile/

Authenticated user profile module: profile CRUD, match list/detail/actions, and conversations.

## Layout

| Folder | Responsibility | Add code when… |
|--------|----------------|----------------|
| **Root** (`me-profile.module`, controller, `me-profile.dto`, errors, validation pipe) | Nest wiring, HTTP entry, shared DTOs | New routes, module providers, cross-cutting DTOs |
| `dto/` | Request/response DTOs | New API field shapes |
| `validators/` | Shared class-validator constraints | New cross-field validation |
| `repositories/` | Prisma ports + adapters | New persistence methods (grandfathered at 27 files) |
| `profile/` | Profile CRUD, analysis, photos, quality, engine mapper | Profile domain behavior |
| `conversations/` | Conversations, messages, rate limits | Messaging features |
| `matches/core/` | `MeMatchesService`, response mappers, profile-matches bridge | Match list orchestration |
| `matches/list/` | Ranking, list cache, materialized list, candidate SQL | List pipeline / ranking |
| `matches/rank/` | Rank persist, backfill, rebuild budget/cap | Rank table jobs |
| `matches/detail/` | Match detail + eligibility | Detail/eligibility paths |
| `matches/actions/` | Like/pass, feedback, mutual, priority, quality audit | Match actions |
| `matches/support/` | Spec harnesses, stubs, match errors | Test support for matches |
| `integration/` | HTTP + WS integration specs + harness **only** | New HTTP/WS integration tests |
| `e2e/` | Cross-cutting new-model e2e suites | New end-to-end scenarios |
| `contracts/` | Domain error base, matching bridge, V1 contract specs | Cross-module contracts |

## Conventions

- **Root** holds the Nest module, controller, shared DTOs/errors/pipe.
- Feature folders group by domain; cross-feature imports use `../<feature>/...`.
- From `matches/<sub>/`, use `../sibling/` for other match subfolders and `../../profile/` for profile.
- **`integration/`** must not contain production `.service.ts` files — specs and harnesses only.
- **No new barrels.**

## Examples

- New HTTP integration: add under `integration/` (reuse `me-profile-http.shared-harness.ts`).
- New rank rebuild helper: add under `matches/rank/`.
- New conversation rate-limit store: add under `conversations/`.
- New profile analysis step: extend `profile/me-profile-analysis.service.ts` or add beside it.
