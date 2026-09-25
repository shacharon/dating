# Story 1: Hint on the page before login

**Status:** Not started
**Depends on:** —

## Why

Analysis is the reason the product exists. If the first time someone hears about it
is after a long sign-up, it feels like a surprise chore. The landing page is where
they decide to sign in.

## What

**As a** visitor who is not signed in
**I want** one sentence about analysis on the main page
**So that** I know what this app does before I create an account

- Show the line only when the Google sign-in call to action is visible (logged-out
  landing). Hide it during session bootstrap, same as the language flags.
- Copy in English, Hebrew, and Spanish. No button, no link, no “analyze now.”
- Place it with the title and the three language flags, not in a modal and not in
  the account menu.

### Acceptance criteria

- [ ] Logged-out landing shows the analysis sentence in en, he, and es
- [ ] The sentence has no button and no link
- [ ] The sentence is hidden while a session is loading and after sign-in
- [ ] A test covers the logged-out sentence and the hidden loading state
