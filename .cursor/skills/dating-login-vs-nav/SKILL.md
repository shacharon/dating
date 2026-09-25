---
name: dating-login-vs-nav
description: >-
  Dating app: login destination and in-app navigation are separate. Login goes
  to onboarding until the first analysis run, then to Matches. Clicking Matches
  (or any existing route) must stay on that route — never redirect a user who
  is already in the app. Use when changing post-login paths, Matches,
  onboarding resume, router.replace after auth, next= query, or when the user
  mentions login, matches click, redirect, or stay on the page.
---

# Dating — login vs in-app nav

## Verbatim (do not weaken)

NEVER NEVER NEVER REDIRECT WHEN U R IN A ROUTE

auto login does something and click on matches do something !!! its not related

1 login to onboarding when its not anysys
2 matches -stayes in matches

## Two jobs. Never mix them.

| Job | When | Where code may send the user |
|-----|------|------------------------------|
| **Login** | Google sign-in / already-authenticated landing only | Onboarding if analysis has **not** started (`DRAFT` or no profile). Matches if analysis **has** started (`SUBMITTED`, `ANALYZING`, `ANALYZED`, `FAILED`). |
| **In-app nav** | User is already on a route (Matches, Conversations, Profile, Onboarding, Settings) | **Stay.** The Matches nav item opens Matches and **stays** on Matches. |

Login logic lives only on the public landing (`PublicLandingClient` / `postLoginPath`). It must **not** run on Matches, AppNav, authenticated layout, or any page the user already opened.

## Do not

- `router.replace` / `redirect` away from Matches because onboarding is incomplete or analysis has not started
- Reuse `postLoginPath` / `onboardingResumePath` as a gate on `/dating/me-matches`
- Send a logged-in user from Matches to `/profile` or `/onboarding` because they clicked Matches
- Treat `next=` as a reason to yank someone off a page they already reached

## Login only (`postLoginPath`)

- No analysis yet → resume onboarding (never `/profile` for this case; last step is `/onboarding/preferences` if onboarding is already `COMPLETED`)
- Analysis started → `/dating/me-matches` (or a safe `next` path)

## Matches

The Matches page stays on Matches. Empty list, photo gate, no-profile gate — all stay on Matches. No “send them to edit profile” on mount.
