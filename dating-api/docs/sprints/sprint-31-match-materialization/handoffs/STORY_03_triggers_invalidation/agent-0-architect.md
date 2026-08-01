# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_triggers_invalidation.md](../../STORY_03_triggers_invalidation.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Wire `MatchListRankQueueService.enqueueRebuild` at locked eligibility-change sites. Coalesce via existing jobId. Keep Redis invalidate-on-rebuild (Story 02); keep existing write-path `invalidateMatchListCache` for immediate list freshness until Story 04. **No** candidate→all-viewers fan-out. Skip Agent 4 if mocked enqueue specs land.

---

## Summary

Story 02 can rebuild ranks but nothing enqueues it. This story hooks **minimum** product events so each affected user-as-viewer gets a coalesced rebuild. Redis remains list SoT until Story 04; rebuild already deletes `match:list:{userId}` after persist.

---

## Inventory (current)

| Event | Today | Gap |
|-------|--------|-----|
| Analysis finish | `profile-analysis` worker `finally` → `invalidateMatchListCache(userId)` | No `enqueueRebuild` |
| Profile submit | Invalidate then enqueue analysis | Rebuild should wait for analysis complete, not submit-only |
| Pref create/patch | No invalidate / rebuild | Eligibility can change silently |
| LIKE/PASS/BLOCK/undo | Invalidate actor cache only | No rank rebuild |
| Unmatch | No invalidate / rebuild | Both sides’ lists stale |

API: `MatchListRankQueueService.enqueueRebuild(viewerUserId, reason?)` + jobId `rebuild:{viewerUserId}`.

---

## Decisions (do not reverse without discussion)

### 1. Scope: viewer-only rebuilds (locked MVP)

| In | Out |
|----|-----|
| Enqueue rebuild for the **changed user as viewer** | Fan-out “all viewers who might rank this candidate” when B analyzes |
| Unmatch → enqueue **both** participant userIds | Reverse-index / batch catch-up jobs |

Document deferred (Story 05+ / ops): candidate-driven reverse rebuild.

### 2. Minimum trigger set (locked)

| # | Site | When | `reason` string (locked) |
|---|------|------|---------------------------|
| A | `profile-analysis.worker.ts` `runJob` | After `analysis.runForUser` returns (in `finally`, same place as today’s invalidate) | `analysis_complete` |
| B | `MeProfileService.patchForUser` / `createForUser` | When eligibility prefs written via `upsertPreference` **or** partner-gender fields on profile that feed matching (accepted genders / age min-max / desiredPartnerGenders dual-write) | `preferences_changed` |
| C | `MeMatchActionsService.createAction` | After successful LIKE / PASS / BLOCK | `match_action` |
| D | `MeMatchActionsService.deleteAction` | After successful undo | `match_action` |
| E | `MeConversationsService.unmatch` | After successful soft unmatch | `unmatch` for **both** `userId1` and `userId2` (or equivalent participant ids) |

**Analysis timing (locked):** Enqueue rebuild on **analysis job completion** (A), not only on submit. Submit may keep Redis invalidate (existing) so list miss rebuilds until ranks catch up.

**Photo moderation approve:** **Out of scope** this story (optional follow-up). Note in risks.

### 3. Coalesce / debounce (locked)

- Rely on Story 02 **jobId** `rebuild:{viewerUserId}` — no extra timer/debounce layer.  
- Multiple rapid events → one pending job; later events while job runs may enqueue a follow-up (Bull allows new jobId after complete) — acceptable.  
- Specs: assert `enqueueRebuild` called; optional assert jobId helper used (already in queue module).

### 4. Redis invalidation strategy (locked)

| When | Action |
|------|--------|
| Rebuild finishes | Already: `invalidateMatchListCache` inside `rebuildMatchListRanks` — **keep** |
| Action / submit / analysis (existing) | **Keep** existing `invalidateMatchListCache` for immediate Redis drop while rebuild is async |
| On enqueue only | **Do not** replace rebuild-time invalidate; optional extra invalidate on enqueue is **not required** |

Until Story 04 reads DB ranks, dual invalidate (write path + rebuild end) is intentional.

### 5. Wiring (locked)

- Inject `MatchListRankQueueService` into the services/worker above (`WorkerModule` already exports it; ensure `MeProfileModule` / conversations module can inject — use existing `forwardRef` patterns if circular).  
- Fire-and-forget: `void enqueueRebuild(...).catch(log)` **or** await enqueue (prefer **await enqueue** so failures surface in request logs; rebuild itself stays async via Bull/inline).  
- Blank userId: enqueue already no-ops.

### 6. Non-triggers (locked)

- `GET /api/v1/me/matches` — never enqueue.  
- Message send / read — never.  
- Feedback / narrative — never.  
- Admin tools — never this story.

### 7. Tests (locked)

| Case | Expect |
|------|--------|
| Analysis worker finally | `enqueueRebuild(userId, 'analysis_complete')` (mock queue) |
| Pref patch that upserts preference | `enqueueRebuild(..., 'preferences_changed')` |
| createAction / deleteAction | `enqueueRebuild(actor, 'match_action')` |
| unmatch | `enqueueRebuild` for **both** users with `'unmatch'` |
| list() / getOrBuildRankedList | No enqueue |

Skip Agent 4.

### 8. Agent 4

- **Skip** if §7 specs land.

---

## Artifacts

| Path | Change |
|------|--------|
| `workers/profile-analysis.worker.ts` | Enqueue after analysis |
| `me-profile.service.ts` (+spec) | Pref create/patch enqueue |
| `me-match-actions.service.ts` (+spec) | Action enqueue |
| `me-conversations.service.ts` (+spec) | Unmatch both sides |
| Module imports | Inject queue service |

---

## Out of scope

- Candidate→viewer fan-out  
- Story 04 list read from `MatchListRank`  
- Photo-moderation-triggered rebuild  
- Removing write-path Redis invalidates  

---

## Agent 1 instructions

1. Wire triggers A–E with locked `reason` strings (§2).  
2. Keep coalesce via jobId only (§3); keep invalidation strategy (§4).  
3. Specs §7 with mocked `MatchListRankQueueService`.  
4. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
feat(matches): enqueue rank rebuilds on analysis and eligibility changes

Sprint 31 Story 3
```

---

## Agent 2 instructions

- [ ] Locked sites enqueue with correct reasons  
- [ ] Unmatch enqueues both participants  
- [ ] Analysis enqueue on job complete (not submit-only)  
- [ ] No list GET enqueue; no candidate fan-out  
- [ ] Coalesce = jobId only; Redis strategy matches §4  
- [ ] Specs mock enqueue  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; sprint README → Story 4 Agent 0.  
- Write `agent-3-pm.md`.

---

## Open risks

1. After B analyzes, A’s materialized ranks omit B until A’s next trigger/rebuild — accepted MVP.  
2. Pref patch that only changes about-me text: Agent 1 should enqueue only when eligibility fields change (or always on `upsertPreference` call — **prefer enqueue whenever `upsertPreference` runs**, simpler and rare).  
3. Inline rebuild without Redis can block request thread if awaited on hot path — enqueue returns quickly in Bull mode; inline mode fire-and-forget inside `enqueueRebuild` already (returns `inline:`) — **await enqueueRebuild** is fine.
