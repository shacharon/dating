# dating-ui architecture

Lean map of how the authenticated app is structured after Sprints 33–36. For story locks, see `docs/sprints/`.

## App shell and global nav

Authenticated surfaces share one chrome (`AuthenticatedAppShell` / dating layout). Primary navigation lives in `src/components/nav/`:

- `AppNav` — responsive shell; picks desktop vs mobile
- `AppNavDesktop` / `AppNavMobile` — layout variants
- `NavItem` — single nav control (label, href, badge, active)
- `nav-active.ts` — pathname helpers (`isMatchesActive`, `isConversationsActive`, `isProfileActive`, …)

Profile nav points at `/profile` and treats hub + analysis tab as profile-active.

## Unified profile hub

Canonical URL: **`/profile`** with `?tab=overview|edit|analysis|settings`.

- Page: `src/app/(authenticated)/profile/`
- Tabs / meter: `src/components/profile/` (`ProfileHubTabs`, overview/edit/analysis/settings tabs, `ProfileQualityMeter`)
- Quality score binds to `GET /api/v1/me/profile/quality` (Sprint 35)
- Legacy routes (`/dating/profile`, `/dating/analysis`, settings profile paths) redirect into the hub

## Match and conversation detail

Large detail pages were split into thin orchestrators + presentational folders (Sprint 36):

| Page | Components | Hooks (reuse, do not fork) |
|------|------------|----------------------------|
| `/dating/me-matches/[id]` | `components/match-detail/*` | `useMatchActions`, `useMatchFeedback`, `useCelebrationFlow` |
| `/dating/conversations/[id]` | `components/conversation/*` | `useConversationMessages`, `useConversationActions` |

Orchestrators own params, meta fetch, hook wiring, and loading/error chrome. Messaging draft state lives in the conversation composer (no required composer hook).

## Hooks and dynamic modals

- Domain logic belongs in `src/hooks/` with colocated specs.
- Heavy dialogs (report, celebration) use `next/dynamic(..., { ssr: false })`, usually colocated in `*-modals.tsx`.

## Testing and tooling

- Unit/integration: **Vitest** (`npm test`)
- Types: `npm run typecheck`
- Lint: `npm run lint` / `npm run lint:fix`

Storybook is **not** installed; optional for a later initiative.

## Known lint / typecheck debt

Repo-wide “0 ESLint problems” and a fully green `tsc` over all specs are **not** claimed. Common deferred categories:

- `react-hooks/set-state-in-effect` (React 19 / compiler plugin noise in locale, auth, pages)
- `@next/next/no-img-element` on avatar/photo placeholders
- Occasional unused vars / explicit `any` in older specs
- Spec/fixture typing gaps (`MessageDto.status`, `NODE_ENV` assigns, realtime mode mocks) that fail `npm run typecheck` while Vitest still runs

Cleanup stories should avoid mass-refactoring those without a dedicated initiative.
