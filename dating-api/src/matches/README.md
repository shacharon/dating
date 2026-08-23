# matches/

## Product vs admin stack

- **Product match list/detail:** `me-profile/matches/` → `MeMatchesService`, `MatchRankingService`, `GET /api/v1/me/matches`
- **This module (`src/matches/`):** admin/engine diagnostics — `MatchesService`, `GET /api/matches`, `POST /api/v1/matches/compare`

Nest module for pair matching: compare engine, list/detail presentation, Holy Grail integration, and admin compare tooling.

## Layout

| Folder | Responsibility | Add code when… |
|--------|----------------|----------------|
| **Root** (`matches.module`, controllers, `matches.service`, `match.types`) | HTTP entrypoints, module wiring, shared DTOs | New routes, module providers, cross-cutting DTOs |
| `admin/` | Admin-only compare evaluation | Admin compare policy changes |
| `api/` | Background daemon, list pipeline, analytics, HTTP smoke specs | HTTP-adjacent services and integration tests |
| `children-unsure/` | Children-unsure product slice (queries, analytics) | Children-unsure matching behavior |
| `compare/` | HG compare helpers, pair snapshots, shadow metrics | Compare hub helpers outside engine stages |
| `compare/compare-stages/` | Deterministic compare pipeline stages | New compare stage or stage test |
| `engine/` | Core match engine, scoring, friction, match IDs | Engine formulas, compare orchestration |
| `explainability/core/` | Explainability manifest, traits, shadow breakdown | Shared explainability wiring |
| `explainability/expansions/01-07/` | Expansion explainability 01–07 | New expansion in 01–07 range |
| `explainability/expansions/10-15/` | Expansion explainability 10–15 | New expansion in 10–15 range |
| `holy-grail/` | HG pair directions, list admission, diagnostics | Holy Grail list/compare integration |
| `match-narrative/` | Narrative fact packs (existing subtree) | Narrative generation — keep imports stable |
| `policies/` | Calibration, coverage, interest alignment | Policy thresholds and flags |
| `presentation/` | Teasers, TLDR, detail UI mappers | List/detail presentation |
| `recommendation/` | Recommendation copy and ranking contract | Recommendation strings / ranking DTOs |

## Conventions

- **Root** holds the Nest anchor (`matches.module.ts`), both controllers, orchestration service, and `match.types.ts`.
- Feature folders group by domain; prefer sibling imports (`../engine/...`, `../policies/...`).
- From `compare/compare-stages/`, use `../../` to reach sibling feature folders.
- Cross-module imports outside `matches/` use normal `src/` relative paths (`../../engine/coverage`, etc.).
- **No barrels** except existing `match-narrative/index.ts`.

## Examples

- New expansion explainability (e.g. 16): add under `explainability/expansions/10-15/`.
- New compare stage: add under `compare/compare-stages/` and wire from `engine/match-engine.ts`.
- New list presentation field: extend `presentation/` mappers and root DTOs in `match.types.ts` if shared.
