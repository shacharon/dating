# Handoff: Agent 3 — PM — Story 7

**Agent:** 3 pm  
**Story:** [STORY_07_landing_language_picker.md](../../STORY_07_landing_language_picker.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 7 closed as Done (engineering gate)** — shared `LanguagePicker` on public landing; locale persists via `writeStoredLocale` before sign-in.
- Full pipeline: architect → dev (verify-only) → code review (+3 tests) → pm.
- **No API / Prisma work.** Settings language page unchanged (Story 1); verify-only for AC.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Schema migrated | N/A | UI-only |
| API implemented | N/A | No backend changes |
| `LanguagePicker` component | Done | `language-picker.tsx` |
| Landing mount | Done | `public-landing-client.tsx` in `showCta` block |
| Settings language page | Verify-only | Same storage key; **2/2** settings spec |
| Tests passing | Done | **351/351** UI; **6/6** landing specs |
| Manual smoke | Pending operator | Story 6 |

---

## Acceptance criteria

**4 / 4** story AC items met (+ bootstrap-hide path tested).

---

## Sprint 12 progress (Story 7)

| # | Story | Status |
|---|--------|--------|
| 0–5 | Core i18n flows | **Done** |
| 6 | Manual smoke | Pending operator |
| 7 | Landing language picker | **Done** |
| 8–9 | Follow-ups | **Done** (on branch) |

Handoffs: `handoffs/STORY_07_landing_language_picker/agent-*.md`

---

## Artifacts updated

| Path | Change |
|------|--------|
| `STORY_07_landing_language_picker.md` | Pipeline note, out-of-scope, engineering DoD |
| `handoffs/STORY_07_landing_language_picker/agent-3-pm.md` | this file |

---

## Deferred (not Story 7 blockers)

- Settings page refactor to `LanguagePicker` — optional follow-up
- Marketing copy polish — out of scope
- Operator browser smoke — Story 6

---

## Tests / verification

- [x] Full UI suite — **351/351** pass
- [x] `public-landing-client.spec.tsx` — **6/6** pass
- [x] `settings/language/page.spec.tsx` — **2/2** pass
- [ ] Operator manual smoke — pending (Story 6)

---

## Open questions / blockers

- None.

---

## Next work

Formal pipelines remaining (optional audit): **Story 8**, **Story 9**.

Sprint-level gap: **Story 6 manual smoke** (operator).

```text
--agent 0 sprint 12 story 8
```

Or skip to Story 6 operator smoke:

```text
--agent 0 sprint 12 story 6
```
