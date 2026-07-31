# Follow-up: Phase 3 — richer LLM narrative with controlled free-text

**Sprint:** 22 follow-up (not in sprint)  
**Status:** Backlog  
**Depends on:** Sprint 22 Stories 1–3 Done

---

## Why

Phase 2 narratives are grounded and safe but can feel generic because they only see structured chips/traits. Phase 3 would let the LLM lightly paraphrase **selected** profile free-text for a more personal "why you match" — after safety filters.

---

## Proposed scope (when prioritized)

- Allow a **redacted / filtered** subset of `aboutMe` / `aboutPartner` / `aboutRelationship` into the narrative fact pack (not full raw dump).
- Mandatory safety/redaction pass before prompt assembly (PII, sensitive health/ex content, etc.).
- Still forbid inventing facts not supported by chips/traits or the allowed quotes.
- Keep evaluation-keyed cache; bump `promptVersion` on Phase 3 prompt change.
- Explicit product + legal review before shipping (purpose expansion of profile text).

## Non-goals until then

- Do not start Phase 3 work inside Sprint 22 Stories 1–3.
- Do not send raw free-text to `match_narrative` in Phase 2.
