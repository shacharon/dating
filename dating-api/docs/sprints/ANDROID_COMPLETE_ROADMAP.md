# Android App Launch — Complete Roadmap (Backend + Frontend)

**Goal:** Clean, fast, maintainable codebase for Android dating app launch.

**Last updated:** Sprint 63 backend complete, frontend sprints planned.

---

## Overview

### Backend Status (dating-api)
✅ **Sprints 57-63:** DONE on main  
🟡 **Sprints 64-65:** Planned (P0 for Android)  
⚪ **Sprint 66:** Optional polish (can skip)

### Frontend Status (dating-ui)
🔴 **FE-01 (Mobile Auth):** P0 BLOCKER — Required for Android  
🔴 **FE-03 (Socket Auth):** P0 BLOCKER — Required for real-time messaging  
🟡 **FE-02 (React Query):** P1 IMPORTANT — Greatly improves UX  
⚪ **FE-04 (Component Cleanup):** P2 OPTIONAL — Defer to post-launch

---

## Current State (Post-Sprint 63)

### Backend Wins ✅

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| `enrichment-v2.ts` | 884 LOC | **37 LOC** | -96% ✅ |
| `evaluate.service.ts` | 695 LOC | **132 LOC** | -81% ✅ |
| `extraction.service.ts` | 797 LOC | **348 LOC** | -56% ✅ |
| Prisma coupling | 28 services | **8 services** | -71% ✅ |
| DIP violations | Many | **Zero** | ✅ |
| Giant HTTP test | 6183 LOC | **Split (4 files)** | ✅ |

### Remaining Backend Work

| Sprint | Focus | Priority | Effort |
|--------|-------|----------|--------|
| 64 | Match ranking (544→200 LOC), legacy cleanup, Prisma peel | 🔴 P0 | 1.5-2 weeks |
| 65 | Test splits (fast CI) | 🔴 P0 | 1 week |
| 66 | HG extracts polish | ⚪ P2 | 1 week (skip) |

### Frontend Blockers (P0)

| Issue | Impact | Sprint |
|-------|--------|--------|
| **Cookie-based auth** | Mobile apps can't authenticate | FE-01 |
| **Socket auth (cookies)** | Real-time messaging broken | FE-03 |
| No token refresh | Sessions expire, users logged out | FE-01 |
| No caching | Slow loads on mobile (3G/4G) | FE-02 |

---

## 🎯 Minimal Launch Path (P0 Only)

**To launch Android app, you MUST complete:**

### Backend
1. ✅ Sprints 57-63 (DONE)
2. 🟡 Sprint 64 (Match ranking + legacy cleanup)
3. 🟡 Sprint 65 (Test velocity)

### Frontend
1. 🔴 **FE-01 Story 1-3** (Token auth — backend + frontend + API client)
   - Effort: 5-7 days
   - Blocker: Auth won't work on mobile
2. 🔴 **FE-03 Story 1-2** (Socket auth — backend + frontend)
   - Effort: 2-3 days
   - Blocker: Messaging won't work on mobile
3. 🟡 **FE-02 Story 1-3** (React Query — matches only, RECOMMENDED)
   - Effort: 2-3 days
   - Not a blocker, but UX will be poor without caching

**FE-01 Story 4** (Platform detection + Android build) can run in parallel with backend work.

**Total frontend effort for P0 launch:** ~7-10 days

---

## 🚀 Recommended Launch Path (P0 + P1)

Add these for better UX (not blockers):

### Frontend
4. 🟡 **FE-02 Story 4-5** (React Query — conversations + profile)
   - Effort: 1-2 days
   - Better mobile performance
5. 🟡 **FE-01 Story 4** (Mobile build — Capacitor or React Native)
   - Effort: 1-2 days
   - Decision: Capacitor (faster) or React Native (better perf)

**Total frontend effort for P0 + P1:** ~10-14 days

---

## 📋 All Sprints Summary

### Backend (dating-api)

| Sprint | Status | Stories | Docs |
|--------|--------|---------|------|
| 57 | ✅ Done | Enrichment decompose | [README](./sprint-57-enrichment-v2-decompose/README.md) |
| 58 | ✅ Done | Extraction orchestration | [README](./sprint-58-extraction-orchestration/README.md) |
| 59 | ✅ Done | Evaluate decomposition | [README](./sprint-59-evaluate-decomposition/README.md) |
| 60 | ✅ Done | Eliminate duplication | [README](./sprint-60-eliminate-duplication/README.md) |
| 61 | ✅ Done | DIP infrastructure ports | [README](./sprint-61-dip-infrastructure-ports/README.md) |
| 62 | ✅ Done | Prisma repositories | [README](./sprint-62-prisma-repositories/README.md) |
| 63 | ✅ Done | Finish Round 3 leftovers | [README](./sprint-63-finish-round3-leftovers/README.md) |
| **64** | 🟡 **Planned** | **Match ranking + legacy cleanup** | **[README](./sprint-64-mobile-backend-lightness/README.md)** |
| **65** | 🟡 **Planned** | **Test velocity (split specs)** | **[README](./sprint-65-test-velocity/README.md)** |
| 66 | ⚪ Optional | HG extracts polish | [README](./sprint-66-optional-polish/README.md) |

### Frontend (dating-ui)

| Sprint | Priority | Stories | Docs |
|--------|----------|---------|------|
| **FE-01** | 🔴 **P0 BLOCKER** | **Mobile auth (token-based)** | **[README](./fe-sprint-01-mobile-auth/README.md)** |
| **FE-02** | 🟡 **P1 IMPORTANT** | **React Query + API SDK** | **[README](./fe-sprint-02-unified-data-layer/README.md)** |
| **FE-03** | 🔴 **P0 BLOCKER** | **Socket token auth** | **[README](./fe-sprint-03-socket-token-auth/README.md)** |
| FE-04 | ⚪ P2 Optional | Component cleanup | [README](./fe-sprint-04-component-cleanup/README.md) |

---

## 📝 Agent Commands

### Backend Commands

**File:** [ROUND3_AGENT_COMMANDS.md](./ROUND3_AGENT_COMMANDS.md)

- Sprints 57-63: Already done, commands for reference only
- **Sprint 64:** Run now (match ranking + legacy cleanup)
- **Sprint 65:** Run after Sprint 64 (test velocity)

### Frontend Commands

**File:** [FRONTEND_AGENT_COMMANDS.md](./FRONTEND_AGENT_COMMANDS.md)

- **FE-01:** Token auth (P0, run now)
- **FE-03:** Socket auth (P0, run after FE-01 Story 2)
- **FE-02:** React Query (P1, run after FE-01 Story 3)
- **FE-04:** Component cleanup (P2, skip for launch)

---

## ⏱️ Timeline Estimate

**Parallel execution (backend + frontend):**

| Week | Backend | Frontend |
|------|---------|----------|
| 1-2 | Sprint 64 (match ranking) | FE-01 Story 1-3 (auth) |
| 2 | Sprint 64 cont. | FE-03 Story 1-2 (socket) |
| 3 | Sprint 65 (test velocity) | FE-02 Story 1-3 (React Query) |
| 3-4 | Sprint 65 cont. | FE-01 Story 4 (Android build) |

**Total: 3-4 weeks to P0 launch readiness**

**If adding P1 (React Query conversations + profile):** +3-5 days

---

## 🚦 Launch Readiness Checklist

### Backend P0
- [ ] Sprint 64 done (match ranking thin, legacy deprecated)
- [ ] Sprint 65 done (specs split, CI fast)
- [ ] API endpoints return data quickly (<200ms p95)
- [ ] No god services >400 LOC
- [ ] Prisma injectors <6 services

### Frontend P0
- [ ] FE-01 done (token auth works on web + Android)
- [ ] FE-03 done (socket auth works on web + Android)
- [ ] Android build runs (emulator or device)
- [ ] Login flow works on Android
- [ ] Messaging works on Android
- [ ] API requests include `Authorization: Bearer <token>`

### Frontend P1 (Recommended)
- [ ] FE-02 Story 1-3 done (matches cached, optimistic updates)
- [ ] Matches load instantly on repeat visits
- [ ] Like/pass updates UI immediately

---

## 📊 Success Metrics

### Performance (Mobile)
- Matches page: <2s initial load (3G), <200ms cached load
- API response time: <200ms p95, <500ms p99
- Socket latency: <100ms message delivery
- App cold start: <3s to login screen

### Code Quality
- Backend: no services >400 LOC
- Frontend: no hooks >100 LOC
- Test suite: <5 min total runtime
- Linter: zero errors

### User Experience
- Auth persists across app restarts
- Messages send/receive in real-time
- Offline: graceful error messages (future: React Query retry)
- Battery: no excessive polling (React Query refetchInterval off)

---

## 🔗 See Also

- [Backend Sprints 64-65](./ANDROID_BACKEND_ROADMAP.md) (old name, superseded by this doc)
- [Backend Agent Commands](./ROUND3_AGENT_COMMANDS.md)
- [Frontend Agent Commands](./FRONTEND_AGENT_COMMANDS.md)
- [Sprint 64 README](./sprint-64-mobile-backend-lightness/README.md)
- [Sprint 65 README](./sprint-65-test-velocity/README.md)
- [FE-01 README](./fe-sprint-01-mobile-auth/README.md)
- [FE-03 README](./fe-sprint-03-socket-token-auth/README.md)
- [FE-02 README](./fe-sprint-02-unified-data-layer/README.md)

---

## 💬 Questions or Issues?

**Before starting:**
- **Capacitor or React Native?** Decide in FE-01 Story 4 (recommend Capacitor for speed)
- **Skip Sprint 66 backend?** Yes, not needed for launch
- **Skip FE-04 frontend?** Yes, defer to post-launch

**During sprints:**
- Backend: Focus on Sprint 64-65, measure LOC reduction
- Frontend: Focus on FE-01 + FE-03 (auth blockers), add FE-02 if time allows
