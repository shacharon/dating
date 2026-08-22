# Sprint 67 — Backend P0 Critical Fixes (Android Blockers)

**Status:** Planned  
**Priority:** 🔴 **P0 BLOCKER** — Android app cannot launch without these  
**Depends on:** Sprints 57-65 complete  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 4 (Android launch prep)

---

## Goal

Fix **showstopper bugs** that will cause immediate Android launch failures:
1. No push notifications = core feature missing
2. Match state corruption = privacy breach
3. Redis silent failure = multi-pod messaging broken
4. Auth issues = Android login blocked

**Non-goals:** 
- Performance optimizations (Sprint 68)
- Code organization (separate track)
- New features

---

## Success Criteria

### Functional
- [ ] FCM push notifications work on Android (background + foreground) — **FE-06** (backend Story 1 Done)
- [x] Device tokens stored and registered — Story 1
- [x] Match actions (PASS/BLOCK) correctly update conversation status — Story 2
- [x] Rematch flow reactivates UNMATCHED conversations — Story 2
- [ ] Redis adapter fails boot if unavailable in production
- [ ] Google auth accepts multiple client IDs (web + Android + iOS)
- [ ] Photo storage defaults validated at boot (require S3 in prod)
- [ ] Photo moderation validated (no mock in prod)

### Testing
- [ ] End-to-end: Android receives push when app backgrounded — **FE-06**
- [x] End-to-end: Block user → conversation becomes UNMATCHED — Story 2 (HTTP/unit; Android UI optional)
- [x] End-to-end: Rematch reopens conversation — Story 2 (HTTP/unit)
- [ ] Integration: Multi-pod messaging (2 pods, users on different pods can chat)
- [ ] Integration: Android native sign-in works

---

## Stories

### Story 1 — FCM Push Notifications Infrastructure
**Effort:** 3-4 days  
**Risk:** 🟠 MEDIUM (new infrastructure, Bull integration)  
**Status:** ✅ **Done** (2026-08-22) — branch `feature/sprint-67-story-1`

### Story 2 — Match State Consistency Fixes
**Effort:** 2 days  
**Risk:** 🟡 LOW (transaction boundaries, data-only)  
**Status:** ✅ **Done** (2026-08-22) — branch `feature/sprint-67-story-2`

### Story 3 — Production Infrastructure Validation
**Effort:** 1 day  
**Risk:** 🟢 LOW (boot-time checks)

### Story 4 — Multi-Audience Google OAuth
**Effort:** 4 hours  
**Risk:** 🟢 LOW (config change)

---

## Before/After Metrics

| Metric | Before | Target After |
|--------|--------|--------------|
| Push notifications | None | FCM working |
| Match state bugs | 2 critical | 0 |
| Redis fail modes | Silent | Fail-fast |
| Google auth audiences | 1 (web) | 3 (web+android+ios) |
| Photo storage validation | None | Boot check |

---

## Dependencies

**Before Sprint 68:** Yes (this sprint fixes blockers first)  
**Before FE-05 (Android project):** Can run parallel  
**Before FE-06 (Android features):** Yes (FCM backend must exist first)

---

## References

- [Backend P0 Audit](../../../.cursor/projects/c-dev-piza-dating/agent-transcripts/...)
- [GO_LIVE_CHECKLIST.md](../GO_LIVE_CHECKLIST.md) - Issues #1-5, #8-9
