# Sprint 48 — Queue & Cron Hardening (P0)

**Status:** In Progress (Story 01 Done)  
**Depends on:** Option A late track recommended (38.3 Done); can start after multi-instance pain is confirmed  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api` only  
**Round:** 2 (Phase 2)

---

## Goal

Make workers and crons safe under multiple API replicas:

1. Stable `jobId` coalesce for profile-analysis + photo-moderation (match-list-rank already has it)
2. Fix profile-analysis `finally` that rebuilds match list even on failure
3. Concurrency caps + clearer inline/Bull degraded behavior
4. Redis leader election (or equivalent) for Photo SLA + mute-expiry crons
5. Queue metrics (enqueue / fail / coalesce / inline)

**Non-goals:** Separate worker process extraction (optional follow-up); changing match scores; UI.

---

## Stories

| # | Story | Priority | Effort | Status | Extra agents |
|---|-------|----------|--------|--------|--------------|
| 01 | [Stable jobIds + analysis finally](./STORY_01_jobids_and_analysis_finally.md) | P0 | 1.5d | **Done** | 5 |
| 02 | [Queue concurrency + metrics](./STORY_02_queue_concurrency_metrics.md) | P0 | 1d | Planned | 5 |
| 03 | [Cron leader lock](./STORY_03_cron_leader_lock.md) | P0 | 1.5d | Planned | 2.5, 5 |

**Order:** 01 → 02 → 03.

---

## Success metrics

| Metric | Target |
|--------|--------|
| Duplicate analysis jobs | Coalesced by stable jobId |
| Failed analysis | Does not blindly enqueue rank rebuild |
| Crons | Single leader tick per interval under N replicas |
| Observability | Queue counters / traces for fail + coalesce |

---

## Roadmap

| Next | Focus |
|------|--------|
| **49** | [Realtime presence fabric](../sprint-49-realtime-presence/README.md) |
