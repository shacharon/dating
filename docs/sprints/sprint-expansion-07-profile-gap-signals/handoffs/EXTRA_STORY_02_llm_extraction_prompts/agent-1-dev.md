# Handoff: Agent 1 — Dev — Extra Story 2

**Agent:** 1 dev  
**Story:** Expansion-07 Extra Story 2 — LLM Extraction Prompts (Provider / Recipient delta)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Track:** Extra — Provider / Recipient Support  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- **Verify-only — no code changes.**
- Audit confirms `supportProviderOrientation` + `supportRecipientOrientation` already in self + partner Exp-07 prompt blocks, ALLOWED KEYS, SIGNAL RULES, and `DOMAIN_ALLOWED`.
- No evaluate-layer or text-inference wiring for Extra keys.
- Expansion-07 extraction unit filters green. LLM delta already shipped in main Story 2.

---

## Artifacts

| Path | Change |
|------|--------|
| Prompt / extraction / DOMAIN_ALLOWED code | **None** |
| `handoffs/EXTRA_STORY_02_llm_extraction_prompts/agent-1-dev.md` | This verification handoff |

---

## Audit evidence

| Check | Result |
|-------|--------|
| Extra keys in `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` | ✅ |
| Extra keys in `EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK` | ✅ |
| Self ALLOWED KEYS includes both | ✅ (`extraction.service.ts`) |
| Partner ALLOWED KEYS includes both | ✅ |
| Self SIGNAL RULES one-liners | ✅ give / receive (not emotional-only) |
| Partner SIGNAL RULES one-liners | ✅ partner who GIVES / RECEIVES |
| Blocks injected into SELF + PARTNER prompts | ✅ `${EXPANSION_07_*_BLOCK}` |
| `DOMAIN_ALLOWED.self` + `.partner` | ✅ both keys |
| `evaluate/` references Extra keys | ✅ none |
| `extraction-text-inference.ts` Extra rules | ✅ none |

---

## Tests / verification

- [x] `extraction.service.spec.ts` -t Expansion-07 — **15/15 pass**
- [x] `extracted-signals.spec.ts` -t Expansion-07 — **5/5 pass**
- [ ] Code changes — **N/A** (none)
- [ ] Promote / evaluate-layer / regex — **not done** (correct)

---

## Open questions / blockers

- None. Extra Story 2 LLM work already satisfied by main Exp-07 Story 2.
- Extra Stories 3–5 remain optional verify-only if continued.

---

## Next agent

```text
--agent 2 expansion 07 extra story 2
```

**Notes:** CR should confirm no-op + prompt-path audit. Do not duplicate Extra prompt modules.
