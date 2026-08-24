# Sprint 73 — Optional Finish (Last Leftovers)

**Status:** Optional — **not blocking**  
**Depends on:** Looking-good baseline (Sprint 71 Done)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api` + light `dating-ui`  
**See also:** [ARCHITECTURE_FINISH.md](../ARCHITECTURE_FINISH.md)

---

## Goal

Close the last “regular suspects” that are **organization / docs**, not hot-path gods:

1. `extraction/` still flat (~55 files)
2. `dating-ui/src/lib/` still flat (~104 files)
3. Missing READMEs on a few modules
4. Thin eligibility harness if still >1000 LOC

**KISS:** Move-only + READMEs. No algorithm changes. No microservices.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Organize extraction/](./STORY_01_organize_extraction.md) | 1–2 days | ⚡ LOW | Optional |
| 02 | [Light FE lib folders](./STORY_02_fe_lib_folders.md) | 1–2 days | ⚡ LOW | Optional |
| 03 | [Module READMEs + harness thin](./STORY_03_readmes_and_harness.md) | 0.5–1 day | ⚡ LOW | Optional |

**Order:** any; 01 and 02 parallel OK.

---

## Success Criteria

- [ ] `extraction/` root ≤15 files
- [ ] `dating-ui/src/lib/` root ≤25 files (group by domain)
- [ ] READMEs: `extraction/`, `holy-grail-matching/`, `evaluate/`
- [ ] `me-matches-eligibility.spec-support.ts` ≤600 LOC **or** documented accept
- [ ] Build + tests green
- [ ] **Each story tip merged to `main` (ahead = 0) before the next story / sprint close**

---

## Honest take

**Skip this sprint for launch.**  
Do it when someone complains “I can't find the extraction prompt builder” or FE `lib/` is a mess in PRs.

Architecture is already **looking good**.
