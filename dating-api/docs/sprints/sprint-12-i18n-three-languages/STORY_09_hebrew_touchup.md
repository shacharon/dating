# Story 9: Hebrew touch-up — remaining UI chrome

**Sprint:** 12 (follow-up)  
**Status:** Done  
**Depends on:** Stories 2–5  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

Wire remaining high-traffic English hardcode to i18n:

- `/dating` hub (Get started, View matches)
- `/dating/analysis` page chrome (loading, errors, section headings, re-run)
- Nav auth unauthenticated strings (Sign in, API error)
- Conversation message load errors

### Out of scope (still English v1)

- Analysis **body** text from LLM
- Match explainability from API
- Privacy / Terms pages

### Acceptance criteria

- [x] Above surfaces use `getCopy(locale)` for all visible labels
- [x] Hebrew copy file complete for new keys
- [x] UI tests pass

---

## Definition of done (engineering)

- [x] `datingHub` + `analysisPage` copy wired on hub and analysis routes
- [x] `navAuth` unauthenticated + `loadMessagesFailed` verified
- [x] `he.ts` / `es.ts` mirrors complete
- [x] Story 9 i18n tests added (360/360 full suite)
