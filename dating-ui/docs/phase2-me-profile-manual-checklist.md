# Phase 2.5 — Me profile enrichment (manual checklist)

Automated gates (run in CI or before release):

- **dating-api:** `npm run validate:phase2-me-profile`  
  (service + HTTP integration + DTO validation + matching bridge contract)
- **dating-ui:** `npm run validate:phase2-me-profile`  
  (API client + profile form + Phase 2.5 enrichment round-trip + middleware)

Run the steps below against a local or staging stack with `dating-api` and `dating-ui` configured (`NEXT_PUBLIC_API_URL`, CORS, cookie domain if cross-origin).

## Preconditions

- [ ] API and UI reachable from the browser.
- [ ] Google (or your configured) login works and sets the `dating_session` cookie on the API domain / with correct `SameSite` for your origins.

## Flows

### 1. Login

- [ ] Open `/login`, complete sign-in, land authenticated (e.g. home or `next` target).
- [ ] `GET /api/v1/auth/me` succeeds from the browser (session present).

### 2. Protected route redirect

- [ ] In a private window (no cookie), open `/onboarding` → redirected to `/login` with `next` including `/onboarding`.
- [ ] Same for `/dating/profile` (or another `/dating/*` path).

### 3. First profile creation (text + enriched fields)

- [ ] While signed in, open `/onboarding` with no existing row → form empty (or API 404 handled until first save).
- [ ] Fill **Basics**: birth date, gender, at least one “open to matching with” checkbox, city/country/location label as desired.
- [ ] Fill at least one **About** section (optional but typical).
- [ ] **Save draft** or **Continue** → `POST /api/v1/me/profile` succeeds (network tab: **201**); response JSON includes enriched keys (`birthDate`, `gender`, `desiredPartnerGenders`, `city`, `country`, `locationLabel`).

### 4. Edit existing draft (PATCH)

- [ ] Change one or more enriched fields and text → **Save draft** → `PATCH /api/v1/me/profile` succeeds (**200**).
- [ ] Optional: open `/dating/profile` and confirm **Basics** + about sections match expectations.

### 5. Refresh persistence (reload from server)

- [ ] After saving, **hard refresh** `/onboarding` → **Basics** and **About** fields match last saved server state (GET prefills; check network **GET `/api/v1/me/profile`** response body).

### 6. Validation sanity (optional but recommended)

- [ ] Try a **future** birth date in the UI → save should fail (**400**) from API.
- [ ] Try **no** partner checkboxes but other fields filled → save should still succeed (`desiredPartnerGenders` omitted / null).

## Done when

All boxes checked with no console or network errors for the steps above.

## Phase 3 handoff (not part of this checklist)

- Analysis submission and engine wiring are **out of scope** for Phase 2.5.
- Product → engine bridge contract: `dating-api/src/me-profile/user-profile-matching-bridge.contract.ts` (Phase 3 consumes this when integrating retrieval and canonical prefs).
