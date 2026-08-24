# Sprint 73 — Optional Finish (Last Leftovers)

**Status:** Done — Stories 01–03 complete  
**Depends on:** Looking-good baseline (Sprint 71 Done)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api` + light `dating-ui`  
**See also:** [ARCHITECTURE_FINISH.md](../ARCHITECTURE_FINISH.md)

---

## Goal

Close the last “regular suspects” that are **organization / docs**, not hot-path gods:

1. ~~`extraction/` still flat (~55 files)~~ → **Story 01 Done** (root **9**)
2. ~~`dating-ui/src/lib/` still flat (~104 files)~~ → **Story 02 Done** (root **2**)
3. ~~Missing READMEs on a few modules~~ → **Story 03 Done** (`holy-grail-matching/`, `evaluate/`; `extraction/` from Story 01)
4. ~~Thin eligibility harness if still >1000 LOC~~ → **Story 03 N/A** (Sprint 69 barrel already thin)

**KISS:** Move-only + READMEs. No algorithm changes. No microservices.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Organize extraction/](./STORY_01_organize_extraction.md) | 1–2 days | ⚡ LOW | **Done** (`feature/sprint-73-story-1`) |
| 02 | [Light FE lib folders](./STORY_02_fe_lib_folders.md) | 1–2 days | ⚡ LOW | **Done** (`feature/sprint-73-story-2`) |
| 03 | [Module READMEs + harness thin](./STORY_03_readmes_and_harness.md) | 0.5–1 day | ⚡ LOW | **Done** (`feature/sprint-73-story-3`) |

**Order:** any; 01 and 02 parallel OK. Land each tip on `main` (ahead = 0) before the next.

---

## Success Criteria

- [x] `extraction/` root ≤15 files — **Story 01** (root **9**)
- [x] `dating-ui/src/lib/` root ≤25 files (group by domain) — **Story 02** (root **2**)
- [x] READMEs: `extraction/` ✅ · `holy-grail-matching/` ✅ · `evaluate/` ✅
- [x] `me-matches-eligibility.spec-support.ts` ≤600 LOC **or** documented accept — **N/A / accept** (Sprint 69)
- [x] Build + tests green — Story 01 (345) · Story 02 (**889** Vitest) · Story 03 (**449** scoped unit)
- [x] **Story 01 tip merged to `main` (ahead = 0)** before Story 02
- [x] **Story 02 tip merged to `main` (ahead = 0)** before Story 03
- [x] **Story 03 tip merged to `main` (ahead = 0)** — sprint complete

---

## Honest take

Architecture is **looking good**. Sprint 73 optional finish is complete.
