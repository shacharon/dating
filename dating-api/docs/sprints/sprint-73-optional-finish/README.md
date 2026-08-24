# Sprint 73 — Optional Finish (Last Leftovers)

**Status:** Optional — Story 01 Done; Stories 02–03 still optional  
**Depends on:** Looking-good baseline (Sprint 71 Done)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api` + light `dating-ui`  
**See also:** [ARCHITECTURE_FINISH.md](../ARCHITECTURE_FINISH.md)

---

## Goal

Close the last “regular suspects” that are **organization / docs**, not hot-path gods:

1. ~~`extraction/` still flat (~55 files)~~ → **Story 01 Done** (root **9**)
2. `dating-ui/src/lib/` still flat (~104 files)
3. Missing READMEs on a few modules (`holy-grail-matching/`, `evaluate/` — `extraction/` README shipped in Story 01)
4. Thin eligibility harness if still >1000 LOC

**KISS:** Move-only + READMEs. No algorithm changes. No microservices.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Organize extraction/](./STORY_01_organize_extraction.md) | 1–2 days | ⚡ LOW | **Done** (`feature/sprint-73-story-1`) |
| 02 | [Light FE lib folders](./STORY_02_fe_lib_folders.md) | 1–2 days | ⚡ LOW | Optional |
| 03 | [Module READMEs + harness thin](./STORY_03_readmes_and_harness.md) | 0.5–1 day | ⚡ LOW | Optional |

**Order:** any; 01 and 02 parallel OK. Land each tip on `main` (ahead = 0) before the next.

---

## Success Criteria

- [x] `extraction/` root ≤15 files — **Story 01** (root **9**)
- [ ] `dating-ui/src/lib/` root ≤25 files (group by domain)
- [ ] READMEs: `extraction/` ✅ · `holy-grail-matching/` · `evaluate/`
- [ ] `me-matches-eligibility.spec-support.ts` ≤600 LOC **or** documented accept
- [x] Build + tests green — **Story 01** (345 tests Agent 2)
- [x] **Story 01 tip merged to `main` (ahead = 0)** before Story 02 / sprint close

---

## Honest take

**Skip remaining stories for launch.**  
Do Story 02–03 when FE `lib/` or missing module READMEs slow PRs.

Architecture is already **looking good**.
