# Story 02 — Thin openai.client + match-explainability

**Sprint:** 72  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Optional

---

## Objective

Reduce adapter/presentation fat without changing behavior:

| File | LOC | Split |
|------|-----|-------|
| `llm/openai/openai.client.ts` | ~600 | client core + retry + telemetry |
| `matches/.../match-explainability.ts` | ~549 | chip builders by family / shared labels |

---

## Success

- [ ] Each resulting file ≤300 LOC
- [ ] LLM + explainability specs green

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
