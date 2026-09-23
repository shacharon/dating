# Story 7: Profile tabs become routes

**Status:** Proposed
**Depends on:** —

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

- [ ] Four routes render their panel as a server-rendered page
- [ ] Browser back moves between profile sections
- [ ] Each route has its own title
- [ ] Every old `?tab=` URL redirects, hash included, covered by tests
- [ ] No component imports all four panels at once
- [ ] `rg "profile\?tab="` returns only the redirect shim and its tests

## Out of scope

- The overview redesign (Story 08)
- Consolidating `/dating/profile` and `/settings/profile/*` — separate cleanup

## Definition of done

- [ ] Deep-linking to `/profile/analysis` loads only that panel
- [ ] Old bookmarks and in-app links all land in the right place
