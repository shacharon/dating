# Story 3: Auditability, safety guardrails, and user visibility

**Sprint:** 17
**Status:** Not started
**Depends on:** Story 2 (classifier wired into eligibility + ranking)

---

## Why

A misclassified sentence here is a **silent** hard-exclude with *less* visibility than the checkbox bug this whole effort started from — there's no settings toggle to inspect, no form field to check. "Not really into smokers, but not a dealbreaker" or "used to smoke, quit two years ago" are genuinely ambiguous; a wrong `HARD_EXCLUDE` call zeroes out a user's matches with nothing anywhere for them (or an operator) to look at. This story is not optional polish — it's what makes Story 2 safe to ship.

---

## What

**As a** user and as an operator
**I want** to see exactly what the engine read as a dealbreaker and why, with room to know it's a machine inference, not a filter I explicitly configured
**So that** a misclassification is discoverable and correctable, not a silent black box

### A. Operator auditability

- [ ] `match-quality-audit.ts` / `build-eligibility-audit.ts`: surface every `HARD_EXCLUDE`/`HARD_REQUIRE` dimension's evidence quote + confidence in the audit JSON, alongside the existing PASS/FAIL/SKIPPED/UNKNOWN breakdown from Sprint 16.
- [ ] Production telemetry (extending Sprint 16's per-dimension outcome counter): log classification volume per tag — how often each tag fires `HARD_EXCLUDE` / `HARD_REQUIRE` / `SOFT`, and the confidence distribution — so a low-precision tag is visible before it causes complaints, not after.
- [ ] Add a `docs/engine/examples/` style worked example for at least 3 tags (one behavioral, one lifestyle, one values/social) showing real (synthetic) input text → classification → evidence → eligibility outcome, for future reviewers.

### B. Conservative defaults (guardrails)

- [ ] Confidence threshold: classifications below a documented minimum confidence (propose starting at a high bar, e.g. only exact/near-exact phrase-pattern matches qualify for `HARD_EXCLUDE`/`HARD_REQUIRE` at all — no threshold tuning via a magic float) never reach `HARD_EXCLUDE`/`HARD_REQUIRE`; they fall back to `SOFT`.
- [ ] Explicit test suite of known-ambiguous real-world phrasings (collect from actual `aboutMe`/`aboutPartner` patterns if available, or construct representative ones) that must **not** trigger a hard classification — this is the regression suite that protects future taxonomy/regex edits from silently tightening into over-blocking.
- [ ] A kill switch: ability to disable a single misbehaving tag's hard-classification (route it to `SOFT`-only) without a deploy, for fast incident response if a tag turns out to be over-firing in production.

### C. User visibility (read-only this story)

- [ ] User's own profile/settings surfaces a short, plain-language list of what the engine currently reads as their dealbreakers/requirements, each with the exact quote it came from (e.g. "We read this as a dealbreaker: 'I don't want to date smokers.'"). Read-only — no edit/override control this story (a plausible fast-follow, not required here).
- [ ] Copy makes clear this is inferred from their own profile text, not a setting they configured — sets the right mental model and gives them a path (edit their bio) to change it if the inference is wrong.
- [ ] i18n keys for this new surface (`en` / `es` / `he`); parity test stays green.

### Acceptance criteria

- [ ] Every `HARD_EXCLUDE`/`HARD_REQUIRE` classification in a production match decision is traceable, via the audit tool, to the exact quote and confidence that produced it.
- [ ] The known-ambiguous phrasing regression suite is green and documented as the guardrail it is (a future PR that breaks one of these tests should read as "you just made a dealbreaker fire on ambiguous text," not as a flaky test to delete).
- [ ] A tag can be forced to `SOFT`-only without a code deploy.
- [ ] Users can see, in their own settings, what got classified as a dealbreaker/requirement from their own text.

### Out of scope (this story)

- Edit/override UI for a misclassified dealbreaker (fast-follow candidate)
- Any change to the classifier's detection logic itself (Story 1) or eligibility/ranking wiring (Story 2) beyond the kill switch
- Notifying users proactively (e.g. push/email) about their classified dealbreakers — this is a passive settings surface, not an active notification

---

## Definition of done

- [ ] Audit tooling shows evidence + confidence for every hard classification
- [ ] Production telemetry on classification volume/confidence per tag exists
- [ ] Conservative-default guardrail tests exist and are documented as regression protection, not incidental coverage
- [ ] Per-tag kill switch exists and is documented in an ops runbook
- [ ] Read-only user-visible dealbreaker/requirement list ships, with i18n parity
- [ ] Full `dating-api` + `dating-ui` test suites green
