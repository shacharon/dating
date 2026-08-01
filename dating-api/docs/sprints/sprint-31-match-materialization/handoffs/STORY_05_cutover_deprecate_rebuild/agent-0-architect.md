# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_cutover_deprecate_rebuild.md](../../STORY_05_cutover_deprecate_rebuild.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Cut over `GET /me/matches` to **materialized-by-default**; keep a guarded legacy escape hatch; document ops backfill + cap policy; update sprint/SCALE/Sprint-27 cross-links. Do **not** delete `buildFullRankedList` (still used by rebuild snapshot + page hydrate + escape hatch). Skip Agent 4 if default/escape-hatch specs land.

---

## Summary

Stories 01–04 ship schema, async rebuild, triggers, and a **flagged** DB-cursor read path (default off). This story flips production intent: unset env → materialized path; explicit off → Redis + request rebuild (ops only). Document that Sprint 27 `MATCH_LIST_CANDIDATE_CAP` no longer defines browse membership under the default path; rebuild work remains bounded by `MATCH_LIST_REBUILD_CANDIDATE_CAP`.

---

## Inventory (current)

| Piece | Behavior |
|-------|----------|
| Flag | `MATCH_LIST_MATERIALIZED` — on only for `1`/`true`/`yes`; **unset = off** |
| Default list | Redis `match:list` + miss `buildFullRankedList` (capped by `MATCH_LIST_CANDIDATE_CAP`) |
| Flagged list | `MatchListRank` cursor + page hydrate; empty → `list_empty` |
| Rebuild | Bull `match-list-rank`; triggers Story 03; snapshot uses rebuild cap |
| Detail | Live `getById` (unchanged — out of scope) |

---

## Decisions (do not reverse without discussion)

### 1. Default-on semantics (locked)

Change `isMatchListMaterializedEnabled()`:

| Env value | Path |
|-----------|------|
| **unset** / blank | **Materialized** (default) |
| `1` / `true` / `yes` (ci) | Materialized |
| `0` / `false` / `no` (ci) | **Legacy escape hatch** (Redis + full rebuild on miss) |
| Any other non-blank | Treat as **legacy** (safe fail → known path) **or** materialized — **lock: treat as legacy** so typos don’t silently “look on” without ops intent; prefer documenting only `0/false/no` for off and `1/true/yes` for explicit on |

**Preferred lock (simpler):**

- Off only when trimmed lower is `0` | `false` | `no`  
- **Everything else (including unset) → on**

Update flag helper comments + `.env.example` (`# MATCH_LIST_MATERIALIZED=1` default-on note; show `=0` as escape hatch).

Update Story 04 specs that assumed unset = off (materialized-list + flag unit specs).

### 2. Escape hatch (locked)

| Item | Lock |
|------|------|
| Purpose | Incident rollback / A-B debug without redeploying code delete |
| Behavior | Exact pre-Story-05 legacy path (`getOrBuildRankedList`) |
| Who | Ops / eng via env only — no admin API this story |
| Duration | Keep code this sprint; deletion is a **later** cleanup epic |

### 3. What stays / what is “deprecated” (locked)

| Keep | Deprecate (docs + comments only) |
|------|----------------------------------|
| `buildFullRankedList` for **rebuild snapshot**, **page hydrate** (`candidateProfileIds`), **legacy GET** | Using request-path full rebuild as **primary** SoT for browse |
| `MATCH_LIST_REBUILD_CANDIDATE_CAP` as **job batch bound** | `MATCH_LIST_CANDIDATE_CAP` as **fairness / who can appear in browse** |
| Redis invalidate helpers | Redis full-list as default SoT |
| Story 03 triggers | — |

**Do not** delete Redis list cache code this story.  
**Do not** remove `MATCH_LIST_CANDIDATE_CAP` env parsing (still used by legacy path).

Comment updates in `match-list-candidate-cap.ts` + `.env.example`:

- List cap: “legacy escape hatch only after Sprint 31 Story 5; not browse fairness.”  
- Rebuild cap: “bounds MatchListRank membership per rebuild; raise for fairness / run backfill.”

### 4. Fairness honesty (locked)

Under default materialized path:

- Browse membership = rows in `MatchListRank` after last rebuild.  
- Those rows are still **capped by** `MATCH_LIST_REBUILD_CANDIDATE_CAP` (default 5000) at snapshot time.  
- Sprint DoD “cap no longer defines browse membership” means **`MATCH_LIST_CANDIDATE_CAP` (1000 analyzedAt)** is retired for default GET — **not** that rebuild is unbounded.  
- Ops note: raise rebuild cap and/or schedule backfill when fairness requires broader pools; candidate→viewer fan-out still deferred.

### 5. Backfill / ops (locked)

Deliver **documentation + a rate-limited enqueue script** (not a new Bull queue type).

| Item | Lock |
|------|------|
| Doc path | `dating-api/docs/sprints/sprint-31-match-materialization/OPS_CUTOVER.md` |
| Script | e.g. `scripts/enqueue-match-list-rank-backfill.ts` (+ optional `package.json` script `match-list:backfill-ranks`) |
| Selection | `UserProfile` where `status = ANALYZED` and has ≥1 approved photo (same gates as list ready) |
| Action | `MatchListRankQueueService.enqueueRebuild(userId, 'backfill')` **or** call Nest bootstrap / prisma+queue init pattern used by other scripts — Agent 1 may use thin Prisma loop + Bull `match-list-rank` add with jobId coalesce if Nest bootstrap is heavy |
| Rate | Env `MATCH_LIST_BACKFILL_DELAY_MS` default **200**; process sequentially or small concurrency **1** (locked: concurrency 1 + delay) |
| Idempotent | jobId `rebuild:{userId}` already coalesces |
| Dry-run | `--dry-run` prints count + sample ids; no enqueue |

Script must **not** call sync `rebuildMatchListRanks` for all users on the request thread of the API.

### 6. Metrics (locked)

| Keep / do | Skip this story |
|-----------|-----------------|
| Existing `recordMatchListLoadTimeMs` on list | New Datadog monitors / alert wiring |
| Existing rebuild duration metric/log from Story 02 | Rebuild-lag histogram across viewers |
| Trace already has `source=materialized` | — |

Optional cheap add (nice-to-have, not required for PASS): counter/log `match_list_path=materialized|legacy` once per list — already partially present; ensure legacy path logs `source=legacy` once if missing.

### 7. Docs cross-links (locked)

Update briefly (no epic rewrite):

| Doc | Change |
|-----|--------|
| Sprint 31 `README.md` | Status → Story 5 in progress after Architect; after Agent 3: sprint Done + check acceptance boxes |
| Sprint 27 `README.md` | Note cap stopgap superseded for default browse by Sprint 31 Story 5 (link) |
| `SCALE_READINESS_CR.md` | One note under Sprint 31 / async match: cutover default-on (or “see Sprint 31”) |
| `.env.example` | Default-on + escape hatch |
| `OPS_CUTOVER.md` | Deploy order: migrate → deploy code → backfill → verify flag unset |

Deploy order (document):

1. Migrations already applied (Stories 1–4).  
2. Deploy Story 5 (default on).  
3. Run backfill (or rely on Story 03 triggers + `list_empty` for active users).  
4. Escape hatch `MATCH_LIST_MATERIALIZED=0` only if needed.

### 8. Non-goals (locked)

- Delete legacy list path / Redis cache module  
- Cut over `getById` / narratives  
- Candidate→viewer fan-out  
- Separate worker deployable  
- Raising default rebuild cap in code (ops env only)  
- Agent 4 load test  

### 9. Tests (locked)

| Case | Expect |
|------|--------|
| Unset env | Materialized path (`matchListRank.findMany` / no Redis full-list get) |
| `MATCH_LIST_MATERIALIZED=0` | Legacy path (cache get / no rank findMany required) |
| Flag helper unit | unset→true; `0`/`false`/`no`→false; `1`/`true`/`yes`→true |
| Backfill script | Dry-run unit or light test optional; **at least** document + script exists; prefer a small pure “select viewers” helper tested if extracted |

Skip Agent 4.

### 10. Agent 4

- **Skip** if §9 specs land.

---

## Artifacts

| Path | Change |
|------|--------|
| `match-list-materialized-flag.ts` (+spec) | Default on; off only 0/false/no |
| `me-matches-materialized-list.spec.ts` | Align with new default |
| `.env.example` | Cutover comments |
| `OPS_CUTOVER.md` | Ops runbook |
| `scripts/enqueue-match-list-rank-backfill.ts` | Rate-limited enqueue |
| Sprint 27 / 31 README + SCALE note | Cross-links |
| Cap helper comments | Deprecate list-cap-as-fairness |

---

## Agent 1 instructions

1. Flip flag default (§1); keep escape hatch (§2).  
2. Docs + ops script (§5–§7); update comments (§3–§4).  
3. Specs §9; do not delete legacy code.  
4. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
feat(matches): cut over match list to materialized ranks by default

Sprint 31 Story 5
```

---

## Agent 2 instructions

- [ ] Unset env → materialized; `0` → legacy  
- [ ] Legacy path still works; rebuild/page hydrate still use `buildFullRankedList` helpers  
- [ ] Cap docs/comments match §3–§4  
- [ ] OPS_CUTOVER + backfill script present  
- [ ] Specs updated for default-on  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark Story 05 + **sprint Done**; check sprint-level acceptance boxes in README.  
- Write `agent-3-pm.md`.

---

## Open risks

1. Empty lists until backfill/triggers/`list_empty` — mitigate with OPS_CUTOVER + backfill before announcing cutover.  
2. Rebuild cap still truncates membership — raise env for fairness; not solved by flag flip alone.  
3. Escape hatch left forever invites dual-path drift — track delete-legacy follow-up outside this story.
