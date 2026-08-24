# Sprint 72 — P1 Mapper + Remaining Thin Services

**Status:** Optional — after architecture finish  
**Depends on:** Sprint 71 Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**See also:** [ARCHITECTURE_FINISH.md](../ARCHITECTURE_FINISH.md)

---

## Goal

Split the last real god object (`profile-to-canonical.mapper.ts`, 704 LOC) and optionally thin services still in the 200–348 LOC band.

**Not blocking launch.** Do when mapper PRs become painful.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Split profile-to-canonical mapper](./STORY_01_split_canonical_mapper.md) | 2–3 days | ⚡ LOW | Optional |
| 02 | [Thin openai.client + explainability](./STORY_02_thin_client_explainability.md) | 1–2 days | ⚡ LOW | Optional |
| 03 | [Batch thin 200–348 LOC services](./STORY_03_batch_thin_services.md) | 2–3 days | ⚡ LOW | Optional |

**Order:** 01 first (highest value). 02–03 optional.

---

## Success Criteria

- [ ] Mapper orchestrator ≤150 LOC; no slice file >200 LOC
- [ ] Freeze policy honored (no new regex/keywords)
- [ ] Services in scope ≤250 LOC or on documented accept list
- [ ] HG + extraction + evaluate tests green
- [ ] **Each story tip merged to `main` (ahead = 0) before the next story / sprint close**

---

## Freeze reminder

[NO_NEW_REGEX_POLICY.md](../sprint-52-keyword-engine-freeze/NO_NEW_REGEX_POLICY.md) — move code only in keyword extracts.
