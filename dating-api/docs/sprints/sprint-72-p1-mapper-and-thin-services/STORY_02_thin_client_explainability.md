# Story 02 — Thin openai.client + match-explainability

**Sprint:** 72  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_02_thin_client_explainability/agent--1-preflight.md) · [architect](./handoffs/STORY_02_thin_client_explainability/agent-0-architect.md) · [dev](./handoffs/STORY_02_thin_client_explainability/agent-1-dev.md) · [CR](./handoffs/STORY_02_thin_client_explainability/agent-2-cr.md) · [PM](./handoffs/STORY_02_thin_client_explainability/agent-3-pm.md)

---

## Objective

Reduce adapter/presentation fat without changing behavior:

| File | Before | Split |
|------|--------|-------|
| `llm/openai/openai.client.ts` | 600 LOC | client + response-text + debug + telemetry |
| `matches/explainability/core/match-explainability.ts` | 549 LOC | labels + chips + reason + reason-templates + barrel |

---

## Shipped layout

### OpenAI

```
llm/openai/
  openai.client.ts                 # 161 — class + re-export extractText
  openai-response-text.ts          # 213
  openai-client-debug.ts           # 132
  openai-client-telemetry.ts       # 171
  openai-client-spec-size.policy.spec.ts
```

### Explainability

```
matches/explainability/core/
  match-explainability.ts                    # 62 — barrel + buildMatchExplainability
  match-explainability.labels.ts             # 116
  match-explainability.chips.ts              # 133
  match-explainability.reason.ts             # 141
  match-explainability.reason-templates.ts   # 145
  match-explainability-spec-size.policy.spec.ts
```

Public import paths unchanged. Spec file unsplit (out of scope).

---

## Success

- [x] Each resulting file ≤300 LOC (openai max **213**; explainability max **145**)
- [x] LLM + explainability specs green (Agent 2: **127** tests incl. smoke)

---

## Shipped

`feature/sprint-72-story-2` @ `aa062bd`

- `aa062bd` — refactor: thin openai.client and match-explainability modules

**Shipped on main:** `0dffad1`  
**Feature tip ahead of main:** 0

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** Client/explainability edits hit ≤213 LOC modules instead of 549–600 LOC monoliths.

---

## SOLID / KISS

- **SRP:** response parse ≠ debug ≠ telemetry; labels ≠ chips ≠ reason copy.
- **KISS:** Move-only; stable re-exports; no behavior changes.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
