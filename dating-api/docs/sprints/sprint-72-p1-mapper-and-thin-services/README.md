# Sprint 72 — P1 Mapper + Remaining Thin Services

**Status:** Stories 01–02 Done — Story 03 still optional  
**Depends on:** Sprint 71 Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**See also:** [ARCHITECTURE_FINISH.md](../ARCHITECTURE_FINISH.md)

---

## Goal

Split the last real god object (`profile-to-canonical.mapper.ts`, ~~704~~ → slices) and optionally thin services still in the 200–348 LOC band.

**Not blocking launch.** Stories 01–02 shipped; Story 03 remains optional hygiene.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Split profile-to-canonical mapper](./STORY_01_split_canonical_mapper.md) | 2–3 days | ⚡ LOW | **Done** (`feature/sprint-72-story-1`) |
| 02 | [Thin openai.client + explainability](./STORY_02_thin_client_explainability.md) | 1–2 days | ⚡ LOW | **Done** (`feature/sprint-72-story-2`) |
| 03 | [Batch thin 200–348 LOC services](./STORY_03_batch_thin_services.md) | 2–3 days | ⚡ LOW | Optional |

**Order:** 01 first (highest value). 02–03 optional.

---

## Success Criteria

- [x] Mapper orchestrator ≤150 LOC; no slice file >200 LOC — **Story 01** (orchestrator **59**, max slice **195**)
- [x] Freeze policy honored (no new regex/keywords) — **Story 01**
- [x] openai.client + match-explainability ≤300 LOC each module — **Story 02** (max **213** / **145**)
- [ ] Remaining 200–348 LOC services ≤250 LOC or on documented accept list — **Story 03**
- [x] HG characterization + policy green for mapper split — **Story 01** (59 tests Agent 2)
- [x] LLM + explainability characterization green — **Story 02** (127 tests Agent 2)
- [x] **Story 01 tip merged to `main` (ahead = 0)** before Story 02
- [x] **Story 02 tip merged to `main` (ahead = 0)** before Story 03

---

## Freeze reminder

[NO_NEW_REGEX_POLICY.md](../sprint-52-keyword-engine-freeze/NO_NEW_REGEX_POLICY.md) — move code only in keyword extracts.
