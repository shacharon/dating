# Handoff: Agent 2 — Code review — Story 3

**Agent:** 2 code-review  
**Story:** [STORY_03_profile_full_why_phase3.md](../../STORY_03_profile_full_why_phase3.md)  
**Sprint:** sprint-23-human-match-copy  
**Date:** 2026-07-31  
**Status:** complete  

**Verdict:** **fixed**

---

## Summary

- Reviewed Phase 3 path: `v4`, redacted/capped `profileExcerpts`, detail-only `resolveMatchNarrative` wire, validator excerpt grounding, fallback ignore excerpts, list LLM-free — matches architect lock.
- **Fixed Major:** PII/deny scrub left literal `[redacted]` tokens that could become grounding/prompt noise; now replace spans with spaces and strip any leftover `[redacted]`.
- **Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `match-narrative-redact.ts` | CR — scrub to spaces; drop `[redacted]` markers |
| `match-narrative-redact.spec.ts` | CR — no-marker + deny-phrase coverage |
| Agent 1 fact-pack / prompt / validate / fallback / me-matches | reviewed OK |

---

## Decisions (do not reverse without discussion)

- Architect allowed `[redacted]` **or** drop span; CR locks **drop/space** so markers never enter lean JSON or grounding tokens.
- List still loads about\* for HG/dealbreakers only — never `resolveMatchNarrative` / generator.
- Product/legal purpose note remains for Agent 3 close.

---

## Issues

| Severity | Issue | Resolution |
|----------|--------|------------|
| Major | `[redacted]` markers could ground / leak into prompt | Fixed — space scrub + strip |
| Minor | Deny-phrase unit coverage thin | Fixed — added scrub test |
| Minor | Browser smoke detail ×2 after `v4` | Deferred — operator |

**Critical:** none.

---

## Runtime topology

**N/A.** After API restart: detail open → `v4` miss → regenerate with excerpts when about\* present.

---

## Tests / verification

- [x] `npx jest --testPathPatterns "match-narrative|me-matches.service.spec" --no-coverage` → **136/136 pass** (narrative + me-matches)
- [x] `prisma migrate deploy`: **N/A**
- [x] Browser Network smoke: **deferred**
- [x] Socket: **N/A**
- [x] List path: only `getById` calls `resolveMatchNarrative` (code review)

---

## E2E verification (agent 4)

**N/A — skip Agent 4.**

---

## Open questions / blockers

- None. Agent 3 should acknowledge product/legal purpose expansion from Agent 0.

---

## Next agent

```text
--agent 3 sprint 23 story 3
```

**Notes for next agent:**

- Mark Story 3 Done if AC/DoD met; Agent 4 correctly skipped.
- Optional: restart API, open match detail twice under `v4` with real about\* overlap.
