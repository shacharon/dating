# Story 7: Profile tabs become routes

**Status:** Done  
**Depends on:** —  
**Shipped on main:** `d0e190be`  
**Feature tip ahead of main:** 0

## Why

`/profile` is one page that swaps four panels based on `?tab=`. Everything lives in
one client component, so the whole hub ships to the browser to show any one panel,
the back button does not move between tabs the way anyone expects, and there is no
per-tab metadata. There are around fifty `/profile?tab=` links across twenty-six
files holding this together.

Each of these is a page. It should be a route.

## What

**As a** user
**I want** Edit, Analysis and Settings to be real pages
**So that** links, the back button and page titles behave normally

| Route | Content |
|-------|---------|
| `/profile` | Overview (redesigned in Story 08) |
| `/profile/edit` | `ProfileEditTab` |
| `/profile/analysis` | `ProfileAnalysisTab` |
| `/profile/settings` | `ProfileSettingsTab` |

- A shared `app/(authenticated)/profile/layout.tsx` owns the heading, the quality
  meter and the nav. `ProfileHubTabs` becomes nav links, not a `role="tablist"`.
- Each route gets its own `metadata` title.
- `/profile?tab=edit` and friends redirect to the new routes, including the existing
  hash deep links (`#photos`, `#story`, `#basic`), so old links and the match-list
  gates keep working. Extend `profile-route-redirects.spec.ts`.
- Sweep the ~50 call sites to the new paths.
- Delete the tab switch in `profile-hub-client.tsx`.

### Acceptance criteria

- [x] Four routes render their panel as a server-rendered page
- [x] Browser back moves between profile sections
- [x] Each route has its own title
- [x] Every old `?tab=` URL redirects, hash included, covered by tests
- [x] No component imports all four panels at once
- [x] `rg "profile\?tab="` returns only the redirect shim and its tests

## Out of scope

- The overview redesign (Story 08)
- Consolidating `/dating/profile` and `/settings/profile/*` — separate cleanup

## Definition of done

- [x] Deep-linking to `/profile/analysis` loads only that panel
- [x] Old bookmarks and in-app links all land in the right place

## Pipeline

| Agent | Verdict |
|-------|---------|
| -1 preflight | ready |
| 0 architect | ready |
| 1 dev | approved (`17a48812`) |
| 2 CR | approved (`9cd71864`) |
| 3.5 UX | approved (`47037f7c`) |
| 2.5 / 4 | N/A |
| 3 PM | Done |

**Handoffs:** [preflight](./handoffs/STORY_07_profile_routes/agent--1-preflight.md) · [architect](./handoffs/STORY_07_profile_routes/agent-0-architect.md) · [dev](./handoffs/STORY_07_profile_routes/agent-1-dev.md) · [CR](./handoffs/STORY_07_profile_routes/agent-2-cr.md) · [UX](./handoffs/STORY_07_profile_routes/agent-3.5-ux.md) · [PM](./handoffs/STORY_07_profile_routes/agent-3-pm.md)
