# Round 3 (Phase 3) — all agent commands

**Purpose:** Paste into Cursor **one command at a time**.  
**Pipeline V2:** [AGENT_PIPELINE_V2.md](./AGENT_PIPELINE_V2.md)  
**Order per story:** `-1 → 0 → 1 → 2 → (4 if listed) → 3 → (5 after deploy)`  
**Orchestrator:** `.cursor/skills/dating-agent-run/SKILL.md`  
**Scan:** [round-3-post-merge-scan canvas](../../../../../../Users/shachar/.cursor/projects/c-dev-piza-dating/canvases/round-3-post-merge-scan.canvas.tsx) (IDE)

**Track order:** **57 → 58 → 59** (god services)  
**Parallel track:** **60** (eliminate duplication)  
**Leftovers:** **63** (enrichment verify, HTTP spec split, Prisma peel, match ISP + rate-limit)  
**Android prep:** **64 → 65** (match-ranking, legacy cleanup, Prisma final → test velocity)  
**Optional polish:** **66** (HG extracts, frozen data — not blocking mobile)

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

**Autorun (optional):** `--autorun sprint 57 story 1`

**Freeze reminder:** Sprint 57 must not add regex/phrases — [NO_NEW_REGEX_POLICY.md](./sprint-52-keyword-engine-freeze/NO_NEW_REGEX_POLICY.md).

---

## Sprint 57 — Enrichment-v2 decompose

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

## Sprint 58 — Extraction orchestration

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

## Sprint 59 — Evaluate decomposition

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

## Sprint 60 — Eliminate duplication (parallel with 57–59)

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

## Sprint 61 — DIP infrastructure ports (Track 3)

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

## Sprint 62 — Prisma repositories (Track 4)

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

## Sprint 63 — Finish Round 3 leftovers

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

## Sprint 64 — Mobile backend lightness (Android prep)

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

## Sprint 65 — Test velocity (fast CI for mobile)

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

## Sprint 66 — Optional polish (HG extracts)

**Not blocking for Android. Only do if you want every file <500 LOC.**

See `sprint-66-optional-polish/README.md` for details.
```