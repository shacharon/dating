# Story 3: No nag anywhere else

**Status:** Done
**Depends on:** Story 2
**Shipped on main:** `652993cc`
**Feature tip ahead of main:** 0

## Why

A hint on the landing page and one block on Profile is enough. The same ask on
Matches, Conversations, or the account menu turns the product into a chore. An
error for an empty “who you are looking for” list is the same kind of anger: the
field is not required yet.

## What

**As a** signed-in user who is not on Profile
**I want** the rest of the app to leave analysis alone
**So that** I am not pushed to run it from every screen

- Matches does not auto-redirect to onboarding or to analysis when the profile is
  unfinished or not analyzed. It may keep its existing empty card.
- Conversations and the account menu do not link to “run analysis.”
- Saving facts with no desired partner genders does not show
  `desiredPartnerGenders must be a non-empty array when provided`. An empty list
  is omitted, not sent. The API treats an empty array as “not provided.”
- Do not remove the existing `/profile/analysis` page. Just do not send people
  there from Matches or the menu.

### Acceptance criteria

- [x] Opening Matches with `not_analyzed` stays on Matches
- [x] The account menu has no analysis item
- [x] A facts save with no partner genders does not return the empty-array error
- [x] Tests cover the Matches stay and the empty partner-genders save
