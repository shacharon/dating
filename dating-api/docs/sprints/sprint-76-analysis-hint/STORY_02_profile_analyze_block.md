# Story 2: Profile hint, button, and result

**Status:** Not started
**Depends on:** —

## Why

The user should meet analysis on the read-only Profile, which is the page about
them. A button before the profile can support a real result makes a bad run and
makes people angry. A missing button after the profile is ready hides the product.

## What

**As a** signed-in user
**I want** Profile to tell me about analysis, then let me run it when it will work
**So that** I know what it is and I only start it once

One block at the top of `/profile` (the read-only overview). Three states:

1. **Not ready.** The story texts together are under 40 characters, or any of these
   is missing: gender (not “prefer not to say”), at least one desired partner
   gender, a location, a birth date. The block explains analysis and what is left.
   No button.
2. **Ready.** Those are saved. The block says the profile is ready and offers
   **Analyze your profile**. Running it submits the existing analysis job.
3. **Done.** A latest analysis with highlights exists. The block shows up to three
   highlight lines. The button is gone.

Copy in English, Hebrew, and Spanish. Do not add a second analyze control on this page.

### Acceptance criteria

- [ ] A thin profile shows the explanation and no analyze button
- [ ] A profile with a story and the four facts shows the button
- [ ] After a successful submit, the block can show the result and hides the button
- [ ] Tests cover the not-ready and ready states
