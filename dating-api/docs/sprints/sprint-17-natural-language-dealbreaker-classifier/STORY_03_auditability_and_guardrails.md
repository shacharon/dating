# Story 3: Auditability, safety guardrails, and user visibility

**Sprint:** 17
**Status:** Done
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

- [x] `match-quality-audit.ts` / `build-eligibility-audit.ts`: surface every `HARD_EXCLUDE`/`HARD_REQUIRE` dimension's evidence quote + confidence in the audit JSON (incl. hard-excluded candidates after CR fix).
- [x] Production telemetry: `event=hg_dealbreaker_outcomes` — classification volume, per-tag outcomes, confidence percentiles, kill-switch tags.
- [x] Worked examples under `docs/engine/examples/dealbreaker-*.md` (smoking, kids_required, commitment_phobic).

### B. Conservative defaults (guardrails)

- [x] Confidence floor `DEALBREAKER_HARD_MIN_CONFIDENCE = 0.9` — mid-confidence HARD demoted to SOFT (not a product tuning knob).
- [x] Ambiguous-phrasing regression suite: `dealbreaker-ambiguous-guardrails.spec.ts` (do-not-delete guardrail).
- [x] Kill switch: `DEALBREAKER_HARD_DISABLED_TAGS` env + `docs/ops/dealbreaker-kill-switch.md` (env + restart; proven in HTTP E2E).

### C. User visibility (read-only this story)

- [x] `GET /api/v1/me/profile` → `inferredDealbreakers` (hard only, post-guardrail); preferences UI section on `/settings/preferences`.
- [x] Copy frames inference from profile text + edit-story path (en/es/he).
- [x] i18n `AppCopySchema.inferredDealbreakers` parity across `en` / `es` / `he`.

### Acceptance criteria

- [x] Hard classifications traceable via admin match-quality audit (`holyGrailEligibility` + evidence/confidence).
- [x] Ambiguous phrasing regression suite green and documented as guardrail.
- [x] Tag forceable to SOFT-only via env kill switch (E2E: smoking kill switch → smoker included).
- [x] Users see inferred dealbreakers/requirements in settings (API + UI; E2E on profile GET).

### Out of scope (this story)

- Edit/override UI for a misclassified dealbreaker (fast-follow candidate)
- Any change to the classifier's detection logic itself (Story 1) or eligibility/ranking wiring (Story 2) beyond the kill switch
- Soft ranking live-path connection (Option C — sprint follow-up)
- Notifying users proactively (e.g. push/email) about their classified dealbreakers — this is a passive settings surface, not an active notification

---

## Definition of done

- [x] Audit tooling shows evidence + confidence for every hard classification
- [x] Production telemetry on classification volume/confidence per tag exists
- [x] Conservative-default guardrail tests exist and are documented as regression protection, not incidental coverage
- [x] Per-tag kill switch exists and is documented in an ops runbook
- [x] Read-only user-visible dealbreaker/requirement list ships, with i18n parity
- [x] Full `dating-api` integration suite green (`integration.spec` 300); UI i18n typed parity for new keys

### Implementation notes (PM close)

- Guardrails choke inside `extractDealbreakerSignalsFromFreeText`; NEVER_BLOCKS unchanged.
- Soft ranking remains deferred (Option C) — not Story 3 scope.
- Pipeline: architect → dev → CR (audit-on-exclude + env re-read) → E2E (kill switch + inferredDealbreakers) → PM.
- Agent 4: complete — `me-new-model-e2e-dealbreaker-guardrails.integration.spec.ts`; baselines unmodified.
