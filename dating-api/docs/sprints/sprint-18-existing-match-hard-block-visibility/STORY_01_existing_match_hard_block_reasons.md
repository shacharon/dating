# Story 1: Disable existing matches that became hard-ineligible, with reasons

**Sprint:** 18  
**Status:** Done  
**Depends on:** [Sprint 17](../sprint-17-natural-language-dealbreaker-classifier/README.md) (live hard dealbreakers + NEVER_BLOCKS)

---

## Why

After Sprint 17, a hard dealbreaker correctly **hides new** candidates. If someone was **already** on your matches list (or you Liked them) and then either:

- you add a dealbreaker, or  
- they update their text/facts so they now conflict,

…they either vanish with no explanation, or linger with a score and no “why.” That feels like a bug. We want a clear warning on **those existing rows only**: disabled, with comments/reasons (can be more than one).

---

## What

**As a** viewer who already had someone on my radar  
**I want** that person to stay visible but clearly **not actionable as a match**, with plain-language reasons  
**So that** I understand the engine blocked them (e.g. my “no smokers” vs their “I smoke”) instead of thinking the list randomly broke

### A. Define “existing” vs “new”

- [x] **New:** never shown to this viewer before (no prior list membership / no relevant `MatchAction` / no conversation — exact rule locked in architect handoff). Hard FAIL → **omit** (unchanged Sprint 17 behavior).
- [x] **Existing:** meets the “already on radar” rule. Hard FAIL → **include** in the response as a disabled row, not omit.

### B. API / list contract

- [x] Extend match list (and detail if needed) with something like:

  ```ts
  hardBlocked?: {
    disabled: true;
    reasons: Array<{
      code: string;           // e.g. DEALBREAKER_SMOKING_EXCLUDE
      dimension: string;      // e.g. smoking | GENDER | AGE
      messageKey?: string;    // i18n key, or server-rendered message for v1
      message: string;        // viewer-facing one-liner
      evidence?: {
        viewerQuote?: string;     // "I don't want smokers"
        counterpartyQuote?: string; // "I smoke"
      };
    }>;
  };
  ```

- [x] Support **multiple reasons** in one response (e.g. dealbreaker smoking FAIL + age FAIL if both apply).
- [x] Disabled rows: no Like as a fresh match path (or Like disabled in UI); existing Liked state can remain visible as history.
- [x] Do **not** auto-create PASS/BLOCK for the viewer.

### C. UI

- [x] Match card (and detail): badge / banner e.g. “No longer a match” / “Blocked by your preferences”.
- [x] Show all reasons (list), including quotes when present.
- [x] i18n `en` / `es` / `he`.
- [x] Optional short CTA: “Edit story / preferences” (link to existing surfaces) — no override editor this story.

### D. When reasons recompute

- [x] On each `GET /me/matches` (and detail): same extract-at-read + HG evaluation as today — no re-analyze required for dealbreaker reasons.
- [x] Stale-analysis banner stays about **scores** only; hard-block reasons are separate copy so users don’t conflate the two.

---

## Acceptance criteria

- [x] User 1 has HARD “don’t want smokers”; User 2 silent → User 2 can appear (NEVER_BLOCKS). User 2 then sets `aboutMe` to `I smoke` → if User 2 was **existing** for User 1, card remains but **disabled** with ≥1 reason citing both sides’ quotes (or equivalent). If User 2 was **new**, they do **not** appear.
- [x] Multiple simultaneous hard FAILs → multiple reason entries.
- [x] Viewer-only: User 2’s profile is not globally disabled for other searchers.
- [x] Baseline Sprint 16/17 E2E suites stay green; new E2E covers existing-vs-new split.
- [x] No soft-ranking work in this story.

### Out of scope

- Soft ranking (Sprint 17 Option C follow-up)
- Push/email to either party
- User override (“keep matching smokers anyway”) UI
- Widening classifier recall (e.g. “like smoking”) — separate taxonomy story if needed
- Auto-unmatch / undo Like

---

## Definition of done

- [x] Existing hard-blocked matches visible + disabled + multi-reason
- [x] New hard-blocked matches still omitted
- [x] API + UI + i18n shipped
- [x] E2E for both branches green
- [x] Product copy reviewed (this draft signed off)

---

## Open product questions — **locked by architect (2026-07-11)**

1. **Existing** = viewer `MatchAction.LIKE` **or** ACTIVE `MutualMatch` (not PASS-only, not “seen in list”).
2. Disabled cards **sort to the bottom** of the same list.
3. Keep **Liked chip** + disabled banner (no Closed bucket this story).
4. API sends EN `message` + `code`/`evidence`; UI prefers i18n from `code` + quotes.

See `handoffs/STORY_01_existing_match_hard_block_reasons/agent-0-architect.md`.
