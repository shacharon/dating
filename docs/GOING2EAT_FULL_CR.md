# Going2Eat full code review

Reviewed 19 Sep 2026. Scope: `C:\dev\piza\angular-piza` — front `llm-angular`, back `server`.

**Overall: ship.** Domain model: anemic. Biggest UI file ~1028 lines. Biggest API file ~816 lines.

This is restaurant **discovery**: natural-language search → rank → deep-link to Wolt / 10bis / Mishloha. No in-app cart, menu CRUD, or checkout.

## Verdict

Engineering is above typical startup search apps: staged pipeline, IDOR checks, photo proxy, signals/OnPush, and real tests. Architecture is a pipeline plus infrastructure, not SOLID OOP around a restaurant domain.

Highest cost: god files, circular `wsManager` imports from `server.ts`, public session minting, and a details route that does not load a restaurant.

## What the system is

Two packages. Angular 19 standalone UI talks to Express 5 + TypeScript. Persistence is Redis (jobs, sessions, WS tickets, provider cache), not a restaurant database. Google Places is the catalog. LLMs gate and route the query.

Pipeline:

`POST /search` → session/JWT → Gate2 LLM → Route-LLM → Places → baseline rank → Wolt/10bis/Mishloha enrich → WS/SSE → search page

Dashed/cycle: enrichment and search import `wsManager` from `server.ts`, which also boots the app.

### Frontend layers (`llm-angular`)

- `api/` HTTP clients → `state/` signal stores → `facades/` + handlers → `features/unified-search`
- Routes: `search`, `search-preview`, `r/:placeId` stub. No auth guards. Feature-flag guards exist and are unused.
- Realtime: `WsClientService` + optional assistant SSE. Anonymous JWT (`g2e_jwt`) plus cookie/session id.

### Backend layers (`server`)

- `controllers` → `services/search/route2` → Google / LLM / Brave → Redis → WS/SSE
- `src/domain/`, `src/schemas/`, `src/realtime/` are empty. Rules live in Route2.
- Auth: public `/auth/token` and `/auth/bootstrap`, then cookie-or-JWT on search. Photo proxy hides the Google key.

## Architecture

### What works

Route2 is a named, logged pipeline (gate → intent → Google → post-filter → rank → enrich). UI: HTTP 202 + poll + WS race, then `RESULT_PATCH` for provider links. Job ownership via `validateJobOwnership`. Provider enrichment is cache-first with locks and PENDING/FOUND/NOT_FOUND. Ranking weights are named constants that sum to 1.

### What does not scale as OOP

| Issue | Where | Why it matters |
| --- | --- | --- |
| Circular singleton | `search.controller`, `route2.orchestrator`, `provider-worker` import `wsManager` from `server.ts` | App layer depends on process bootstrap. Hard to test. |
| Empty domain | `server/src/domain` | `RestaurantResult` is a DTO. Folders lie. |
| DTO = UI model | `domain/types/search.types.ts` | Three protocol files (domain, contracts, ws-protocol). |
| Controller as service | `AssistantSseOrchestrator` (~816 lines) | HTTP + poll + LLM + ownership + SSE in `controllers/stream`. |
| Hybrid Angular src | `llm-angular/src/{controllers,services,server.ts}` | Node search code sits next to the UI tree. |

**Auth is three systems:** Bearer JWT, signed session cookie, optional Redis session store. Bootstrap is mounted twice in `auth.controller.ts` (`/bootstrap` and `/`). Anyone can mint a session (rate-limited). Fine for anonymous search; costly if Google/LLM quota is the bill.

## OOP / SOLID

**Backend:** Composition over inheritance. Real ports (`ISearchJobStore`, `LLMProvider`, search adapters). DI is incomplete: controllers import module singletons. God coordinators remain. Job-store Proxy makes every method async via a `get` trap. `AuthenticatedRequest` defined in three middleware files. JWT verify duplicated.

**Frontend:** Facade + handler split is right (`SearchApiHandler`, `SearchWsHandler`, `SearchAssistantHandler`). `SearchFacade` still ~755 lines. `RestaurantCardComponent` is a presentational god object (photos, hours, distance, stars, social proof, actions, deeplinks). Good SRP: WS connection/router/subscriptions, `SearchStore.patchRestaurant`, `LocationService`. Dead: `PlacesApiService`, `DialogueApiService`, `PrefsService`.

## Oversized files

Split target: ~400 lines.

| Lines | File | Split into |
| ---: | --- | --- |
| ~1028 | `restaurant-card.component.ts` | Hours util, provider-links, photo/src, dumb card |
| 911 | `search-page.component.scss` | Tokens + region partials |
| 816 | `assistant-sse.orchestrator.ts` | Ownership, poll, LLM stream, SSE protocol |
| 779 | `i18n.service.ts` | JSON locale files; service as loader |
| 755 | `search.facade.ts` | Keep submit; move WS switch / response shaping |
| 646 | `search-page.component.ts` | Container vs URL/filter/assistant rules |
| 627 | `provider-verifier-utils.ts` | Per-provider helpers |
| 603 | `text-search.handler.ts` | Google text-search stages |
| 572 | `route2.orchestrator.ts` | Already partially split; still thick |
| 521 | `openai.provider.ts` | Provider vs prompt/cost |

## Magic numbers

**Ranking (`ranking-apply.ts` BASELINE_WEIGHTS):** rating 0.45 · review/social 0.25 · distance 0.15 · openNow 0.10 · priceFit 0.05. Extra: city geocode bias 20 km in `text-search.handler.ts`.

| Value | Location | Meaning |
| --- | --- | --- |
| 300 / 60s | `server` `app.ts` | Global rate limit |
| 30_000 ms | `app.ts` | req/res timeout |
| 45_000 ms | `route2.config.ts` | Pipeline timeout |
| `'30d'` + clockTolerance 5 | token + auth middleware | JWT life / skew |
| TICKET_TTL 60s | `ws-ticket.controller.ts` | One-time WS ticket |
| FOUND cache 14 days | `provider.contracts.ts` | Provider URL TTL |
| NEAR 600 m | `restaurant-card.component.ts` | Near-you badge |
| confidence &lt; 0.6 | `search-page.component.ts` | Show assistant |
| HTTP 20s, 1 retry, 300ms | `http-timeout-retry.interceptor.ts` | Client HTTP |
| geo 15–20s, maxAge 5–10 min | `location.service.ts` | Geolocation |
| walk 83.3 m/min | `distance.util.ts` | ETA |
| msPerWord 110, max 5s | `assistant-streaming.config.ts` | Typing effect |
| `'/food/grid'` | `feature-flag.guard.ts` | Dead default redirect |

UI thresholds should live in one constants module. Search-page chrome is hardcoded English while `i18n.service.ts` is 779 lines.

## Low-level findings

| Sev | Area | Finding |
| --- | --- | --- |
| P1 | Front WS | `SearchWsHandler.subscribeToMessages` subscribes to `messages$` and returns void. Facade never unsubscribes. |
| P1 | Back Redis | `enrichSingleRestaurant`: GET per place, then another GET for cache age. No MGET. Up to 10 places × 3 providers. |
| P1 | Product | `/r/:placeId` only prints the placeId. Cards still navigate there. |
| P2 | Back jobs | Async search returns 202 if Redis job create fails, then still runs search. |
| P2 | Typing | Widespread `as any` on WS payloads despite protocol types. |
| P3 | Analytics | In-memory ring buffer (1000). Wrong for more than one API instance. |
| P3 | i18n | Assistant summary forced locale `'en'`. Card strings translated; chrome not. |

Do not treat public token minting as authz. `/api/v1/auth/token` and `/auth/bootstrap` issue identity. Job IDOR binds results to that session. That stops casual IDOR; it does not stop quota burn.

## What is already solid

- **Security:** Helmet, CORS origin checks, JWT secret fail-fast, separate session cookie secret, photo proxy, WS tickets (60s, one-time), IDOR → 404, placeId regex on details.
- **Angular:** Standalone, signals, OnPush, lazy routes, functional interceptors, zone eventCoalescing, APP_INITIALIZER for JWT before WS.
- **Tests:** Heavy Route2 / enrichment / WS tests. ~43 UI specs (card actions, chips, location-resume, page flows).

## Suggested cut order

1. Inject a WsPublisher port; stop importing `server.ts` from search/enrichment.
2. Return `Subscription` from `subscribeToMessages`; unsubscribe in facade destroy.
3. Split restaurant-card (utils + provider-links + dumb card).
4. Redis MGET / pipeline for provider cache reads.
5. Either fetch details on `/r/:placeId` or stop linking there.
6. Delete or fill empty `domain`/`schemas`/`realtime`; drop unused Places/Dialogue APIs.
7. Move remaining timeouts/limits next to `route2Config`; one UI constants module.
8. Dedupe bootstrap mount and `AuthenticatedRequest` / JWT verify.
