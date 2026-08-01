# Handoff: Agent 0 — Architect — Sprint 34 Story 4 Content

**Agent:** 0 architect  
**Story:** Profile writing prompts — content  
**Sprint:** sprint-34-messaging-content  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Content brief lock. **No product code. No final copy yet** (Agent 1 writes it). **Skip Agent 4.**

---

## Summary

Lock English source prompts/examples/guidance for `aboutMe` / `aboutPartner` / `aboutRelationship` into `STORY_04_writing_prompts.md`. Policy-safe, inclusive, no emoji; implementation + i18n come in a later waterfall.

Full lock: [STORY_04_writing_prompts_CONTENT_LOCK.md](../../STORY_04_writing_prompts_CONTENT_LOCK.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `STORY_04_writing_prompts.md` | **new** — full EN copy per lock structure |

---

## Decisions (do not reverse)

1. Content phase = EN markdown only; no React/i18n.  
2. Field keys match product: `aboutMe`, `aboutPartner`, `aboutRelationship`.  
3. 3–4 questions + exactly 3 examples + guidance per field.  
4. Soft recommend ~50–150 words; examples ~40–90 words.  
5. No emoji; moderation-safe examples.  
6. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_04_writing_prompts_CONTENT_LOCK.md`  
2. Write `STORY_04_writing_prompts.md` to that schema  
3. Do not change app code  

**Next command:**

```
--agent 1 sprint 34 story 4 content
```
