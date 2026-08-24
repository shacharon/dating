# Round 3 (Phase 3) — all agent commands

**Purpose:** Paste into Cursor **one command at a time**.  
**Pipeline V2:** [AGENT_PIPELINE_V2.md](./AGENT_PIPELINE_V2.md)  
**Order per story:** `-1 → 0 → 1 → 2 → (4 if listed) → 3 → (5 after deploy)`  
**Orchestrator:** `.cursor/skills/dating-agent-run/SKILL.md`  
**Scan:** [round-3-post-merge-scan canvas](../../../../../../Users/shachar/.cursor/projects/c-dev-piza-dating/canvases/round-3-post-merge-scan.canvas.tsx) (IDE)

### Hard rule — land every story on `main`

After **Agent 3** marks a story **Done**, that agent **must**:

1. Merge `feature/sprint-<s>-story-<m>` into `main`
2. `git push origin main`
3. Verify `git rev-list --count origin/main..<feature-branch>` = **0**
4. Write `Shipped on main: <sha>` on the story

**Agent -1** blocks the next story if the previous tip is still ahead of `main`.  
Do **not** start the next sprint while any `feature/sprint-<n>-*` tip is ahead of `main`.

**Track order:** **57 → 58 → 59** (god services)  
**Parallel track:** **60** (eliminate duplication)  
**Leftovers:** **63** (enrichment verify, HTTP spec split, Prisma peel, match ISP + rate-limit)  
**Android prep:** **64 → 65** (match-ranking, legacy cleanup, Prisma final → test velocity)  
**Optional polish:** **66** (HG extracts) · **69 Done on main** · **72 / 73** (finish leftovers — not blocking)  
**Closeout:** [ARCHITECTURE_FINISH.md](./ARCHITECTURE_FINISH.md)

| Sprint | Folder | Extra agents |
|--------|--------|--------------|
| 57 | [`sprint-57-enrichment-v2-decompose`](./sprint-57-enrichment-v2-decompose/) | 4 on S3 |
| 58 | [`sprint-58-extraction-orchestration`](./sprint-58-extraction-orchestration/) | 4 on S3 |
| 59 | [`sprint-59-evaluate-decomposition`](./sprint-59-evaluate-decomposition/) | 4 on S3 |
| 60 | [`sprint-60-eliminate-duplication`](./sprint-60-eliminate-duplication/) | 4 on S3 |
| 61 | [`sprint-61-dip-infrastructure-ports`](./sprint-61-dip-infrastructure-ports/) | 4 on S3 |
| 62 | [`sprint-62-prisma-repositories`](./sprint-62-prisma-repositories/) | 4 on S4 |
| 63 | [`sprint-63-finish-round3-leftovers`](./sprint-63-finish-round3-leftovers/) | 4 on S4 |
| 64 | [`sprint-64-mobile-backend-lightness`](./sprint-64-mobile-backend-lightness/) | 4 on S4 |
| 65 | [`sprint-65-test-velocity`](./sprint-65-test-velocity/) | 4 on S2-3 |
| 66 | [`sprint-66-optional-polish`](./sprint-66-optional-polish/) | Optional |
| 69 | [`sprint-69-p0-test-splitting`](./sprint-69-p0-test-splitting/) | Optional |
| 72 | [`sprint-72-p1-mapper-and-thin-services`](./sprint-72-p1-mapper-and-thin-services/) | Optional |
| 73 | [`sprint-73-optional-finish`](./sprint-73-optional-finish/) | Optional |

**Autorun (optional):** `--autorun sprint 57 story 1`

**Freeze reminder:** Sprint 57 must not add regex/phrases â [NO_NEW_REGEX_POLICY.md](./sprint-52-keyword-engine-freeze/NO_NEW_REGEX_POLICY.md).

---

## Sprint 57 â Enrichment-v2 decompose

```text
--agent -1 sprint 57 story 1
--agent 0 sprint 57 story 1
--agent 1 sprint 57 story 1
--agent 2 sprint 57 story 1
--agent 3 sprint 57 story 1

--agent -1 sprint 57 story 2
--agent 0 sprint 57 story 2
--agent 1 sprint 57 story 2
--agent 2 sprint 57 story 2
--agent 3 sprint 57 story 2

--agent -1 sprint 57 story 3
--agent 0 sprint 57 story 3
--agent 1 sprint 57 story 3
--agent 2 sprint 57 story 3
--agent 4 sprint 57 story 3
--agent 3 sprint 57 story 3
```

---

## Sprint 58 â Extraction orchestration

```text
--agent -1 sprint 58 story 1
--agent 0 sprint 58 story 1
--agent 1 sprint 58 story 1
--agent 2 sprint 58 story 1
--agent 3 sprint 58 story 1

--agent -1 sprint 58 story 2
--agent 0 sprint 58 story 2
--agent 1 sprint 58 story 2
--agent 2 sprint 58 story 2
--agent 3 sprint 58 story 2

--agent -1 sprint 58 story 3
--agent 0 sprint 58 story 3
--agent 1 sprint 58 story 3
--agent 2 sprint 58 story 3
--agent 4 sprint 58 story 3
--agent 3 sprint 58 story 3
```

---

## Sprint 59 â Evaluate decomposition

```text
--agent -1 sprint 59 story 1
--agent 0 sprint 59 story 1
--agent 1 sprint 59 story 1
--agent 2 sprint 59 story 1
--agent 3 sprint 59 story 1

--agent -1 sprint 59 story 2
--agent 0 sprint 59 story 2
--agent 1 sprint 59 story 2
--agent 2 sprint 59 story 2
--agent 3 sprint 59 story 2

--agent -1 sprint 59 story 3
--agent 0 sprint 59 story 3
--agent 1 sprint 59 story 3
--agent 2 sprint 59 story 3
--agent 4 sprint 59 story 3
--agent 3 sprint 59 story 3
```

---

## Sprint 60 â Eliminate duplication (parallel with 57â59)

```text
--agent -1 sprint 60 story 1
--agent 0 sprint 60 story 1
--agent 1 sprint 60 story 1
--agent 2 sprint 60 story 1
--agent 3 sprint 60 story 1

--agent -1 sprint 60 story 2
--agent 0 sprint 60 story 2
--agent 1 sprint 60 story 2
--agent 2 sprint 60 story 2
--agent 3 sprint 60 story 2

--agent -1 sprint 60 story 3
--agent 0 sprint 60 story 3
--agent 1 sprint 60 story 3
--agent 2 sprint 60 story 3
--agent 4 sprint 60 story 3
--agent 3 sprint 60 story 3
```

---

## Sprint 61 â DIP infrastructure ports (Track 3)

```text
--agent -1 sprint 61 story 1
--agent 0 sprint 61 story 1
--agent 1 sprint 61 story 1
--agent 2 sprint 61 story 1
--agent 3 sprint 61 story 1

--agent -1 sprint 61 story 2
--agent 0 sprint 61 story 2
--agent 1 sprint 61 story 2
--agent 2 sprint 61 story 2
--agent 3 sprint 61 story 2

--agent -1 sprint 61 story 3
--agent 0 sprint 61 story 3
--agent 1 sprint 61 story 3
--agent 2 sprint 61 story 3
--agent 4 sprint 61 story 3
--agent 3 sprint 61 story 3
```

---

## Sprint 62 â Prisma repositories (Track 4)

```text
--agent -1 sprint 62 story 1
--agent 0 sprint 62 story 1
--agent 1 sprint 62 story 1
--agent 2 sprint 62 story 1
--agent 3 sprint 62 story 1

--agent -1 sprint 62 story 2
--agent 0 sprint 62 story 2
--agent 1 sprint 62 story 2
--agent 2 sprint 62 story 2
--agent 3 sprint 62 story 2

--agent -1 sprint 62 story 3
--agent 0 sprint 62 story 3
--agent 1 sprint 62 story 3
--agent 2 sprint 62 story 3
--agent 3 sprint 62 story 3

--agent -1 sprint 62 story 4
--agent 0 sprint 62 story 4
--agent 1 sprint 62 story 4
--agent 2 sprint 62 story 4
--agent 4 sprint 62 story 4
--agent 3 sprint 62 story 4
```

---

## Sprint 63 â Finish Round 3 leftovers

```text
--agent -1 sprint 63 story 1
--agent 0 sprint 63 story 1
--agent 1 sprint 63 story 1
--agent 2 sprint 63 story 1
--agent 3 sprint 63 story 1

--agent -1 sprint 63 story 2
--agent 0 sprint 63 story 2
--agent 1 sprint 63 story 2
--agent 2 sprint 63 story 2
--agent 3 sprint 63 story 2

--agent -1 sprint 63 story 3
--agent 0 sprint 63 story 3
--agent 1 sprint 63 story 3
--agent 2 sprint 63 story 3
--agent 3 sprint 63 story 3

--agent -1 sprint 63 story 4
--agent 0 sprint 63 story 4
--agent 1 sprint 63 story 4
--agent 2 sprint 63 story 4
--agent 4 sprint 63 story 4
--agent 3 sprint 63 story 4
```

---

## Sprint 64 â Mobile backend lightness (Android prep)

```text
--agent -1 sprint 64 story 1
--agent 0 sprint 64 story 1
--agent 1 sprint 64 story 1
--agent 2 sprint 64 story 1
--agent 3 sprint 64 story 1

--agent -1 sprint 64 story 2
--agent 0 sprint 64 story 2
--agent 1 sprint 64 story 2
--agent 2 sprint 64 story 2
--agent 3 sprint 64 story 2

--agent -1 sprint 64 story 3
--agent 0 sprint 64 story 3
--agent 1 sprint 64 story 3
--agent 2 sprint 64 story 3
--agent 4 sprint 64 story 3
--agent 3 sprint 64 story 3
```

---

## Sprint 65 â Test velocity (fast CI for mobile)

```text
--agent -1 sprint 65 story 1
--agent 0 sprint 65 story 1
--agent 1 sprint 65 story 1
--agent 2 sprint 65 story 1
--agent 3 sprint 65 story 1

--agent -1 sprint 65 story 2
--agent 0 sprint 65 story 2
--agent 1 sprint 65 story 2
--agent 2 sprint 65 story 2
--agent 3 sprint 65 story 2

--agent -1 sprint 65 story 3
--agent 0 sprint 65 story 3
--agent 1 sprint 65 story 3
--agent 2 sprint 65 story 3
--agent 3 sprint 65 story 3
```

---

## Sprint 66 â Optional polish (HG extracts)

**Not blocking for Android. Only do if you want every file <500 LOC.**

See `sprint-66-optional-polish/README.md` for details.
```

---

## Architecture finish (looking good)

**Closeout:** [ARCHITECTURE_FINISH.md](./ARCHITECTURE_FINISH.md)

Sprints **7071** shipped (directories + god service facades).  
Optional only: **69** (specs), **72** (mapper), **73** (extraction / FE lib).

---

## Sprint 69  Optional: remaining giant specs

```text
--agent -1 sprint 69 story 1
--agent 0 sprint 69 story 1
--agent 1 sprint 69 story 1
--agent 2 sprint 69 story 1
--agent 3 sprint 69 story 1

--agent -1 sprint 69 story 2
--agent 0 sprint 69 story 2
--agent 1 sprint 69 story 2
--agent 2 sprint 69 story 2
--agent 3 sprint 69 story 2

--agent -1 sprint 69 story 3
--agent 0 sprint 69 story 3
--agent 1 sprint 69 story 3
--agent 2 sprint 69 story 3
--agent 3 sprint 69 story 3

--agent -1 sprint 69 story 4
--agent 0 sprint 69 story 4
--agent 1 sprint 69 story 4
--agent 2 sprint 69 story 4
--agent 3 sprint 69 story 4
```

---

## Sprint 72  Optional: mapper + thin services

```text
--agent -1 sprint 72 story 1
--agent 0 sprint 72 story 1
--agent 1 sprint 72 story 1
--agent 2 sprint 72 story 1
--agent 3 sprint 72 story 1

--agent -1 sprint 72 story 2
--agent 0 sprint 72 story 2
--agent 1 sprint 72 story 2
--agent 2 sprint 72 story 2
--agent 3 sprint 72 story 2

--agent -1 sprint 72 story 3
--agent 0 sprint 72 story 3
--agent 1 sprint 72 story 3
--agent 2 sprint 72 story 3
--agent 3 sprint 72 story 3
```

---

## Sprint 73  Optional finish (extraction + FE lib)

```text
--agent -1 sprint 73 story 1
--agent 0 sprint 73 story 1
--agent 1 sprint 73 story 1
--agent 2 sprint 73 story 1
--agent 3 sprint 73 story 1

--agent -1 sprint 73 story 2
--agent 0 sprint 73 story 2
--agent 1 sprint 73 story 2
--agent 2 sprint 73 story 2
--agent 3 sprint 73 story 2

--agent -1 sprint 73 story 3
--agent 0 sprint 73 story 3
--agent 1 sprint 73 story 3
--agent 2 sprint 73 story 3
--agent 3 sprint 73 story 3
```
