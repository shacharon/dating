# Handoff: Agent 0 — Architect — Sprint 34 Story 4 Implementation

**Agent:** 0 architect  
**Story:** Onboarding writing prompts — implementation  
**Sprint:** sprint-34-messaging-content  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** UI/i18n lock. **No product code.** Agent 1 implements. **Skip Agent 4.**

---

## Summary

Wire `STORY_04_writing_prompts.md` into texts onboarding: soft word count + always-visible questions; examples and tips collapsed by default. No emoji, no invented hard max. en/he/es.

Full lock: [STORY_04_writing_prompts_IMPLEMENTATION.md](../../STORY_04_writing_prompts_IMPLEMENTATION.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `onboarding/onboarding-text-field-help.tsx` (+ spec) | **new** help UI |
| `onboarding-texts-form.tsx` (+ spec) | wire under each field |
| `i18n` types + en/he/es | chrome + field bodies |

---

## Decisions (do not reverse)

1. Word-based soft guidance (50–150), not fake 500-char max.  
2. Questions always on; examples + tips collapsed by default.  
3. No emoji; zinc hierarchy.  
4. Prefer one help component.  
5. EN from content doc; he/es translated.  
6. Skip Agent 4.

---

## Agent 1 brief

1. Read implementation lock + `STORY_04_writing_prompts.md`  
2. i18n → help component → form → specs  
3. Do not change dating-api  

**Next command:**

```
--agent 1 sprint 34 story 4 implementation
```
