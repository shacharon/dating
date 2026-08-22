# Frontend Agent Commands — All Sprints

**Repo:** `dating-ui` (frontend)  
**Context:** Android app launch prep (mobile auth, data layer, socket auth, component cleanup)  

**Track order:** **FE-01 → FE-03** (P0 blockers), then **FE-02** (P1 important), then **FE-04** (P2 optional polish)

| Sprint | Folder | Priority | Stories |
|--------|--------|----------|---------|
| FE-01 | [`fe-sprint-01-mobile-auth`](./fe-sprint-01-mobile-auth/) | 🔴 **P0 BLOCKER** | 4 |
| FE-02 | [`fe-sprint-02-unified-data-layer`](./fe-sprint-02-unified-data-layer/) | 🟡 **P1 IMPORTANT** | 5 |
| FE-03 | [`fe-sprint-03-socket-token-auth`](./fe-sprint-03-socket-token-auth/) | 🔴 **P0 BLOCKER** | 2 |
| FE-04 | [`fe-sprint-04-component-cleanup`](./fe-sprint-04-component-cleanup/) | 🟢 **P2 OPTIONAL** | 3 |

---

## Paste commands (Cursor)

Paste **one line at a time** in order: `-1 → 0 → 1 → 2 → (4 if listed) → 3`

---

## FE Sprint 01 — Mobile Auth (Token-Based)

**P0 BLOCKER:** Android cannot launch without token auth.

```text
--agent -1 fe sprint 01 story 1
--agent 0 fe sprint 01 story 1
--agent 1 fe sprint 01 story 1
--agent 2 fe sprint 01 story 1
--agent 3 fe sprint 01 story 1

--agent -1 fe sprint 01 story 2
--agent 0 fe sprint 01 story 2
--agent 1 fe sprint 01 story 2
--agent 2 fe sprint 01 story 2
--agent 3 fe sprint 01 story 2

--agent -1 fe sprint 01 story 3
--agent 0 fe sprint 01 story 3
--agent 1 fe sprint 01 story 3
--agent 2 fe sprint 01 story 3
--agent 3 fe sprint 01 story 3

--agent -1 fe sprint 01 story 4
--agent 0 fe sprint 01 story 4
--agent 1 fe sprint 01 story 4
--agent 2 fe sprint 01 story 4
--agent 3 fe sprint 01 story 4
```

**Stories:**  
1. Backend token endpoint + middleware (JWT, dual-mode auth)  
2. Frontend auth context + token storage (AuthProvider, useAuth hook)  
3. API client integration (Axios/fetch + token interceptor)  
4. Platform detection + mobile stub (Capacitor or React Native)

---

## FE Sprint 02 — Unified Data Layer (React Query + SDK)

**P1 IMPORTANT:** Not a blocker, but greatly improves mobile UX (caching, optimistic updates).

```text
--agent -1 fe sprint 02 story 1
--agent 0 fe sprint 02 story 1
--agent 1 fe sprint 02 story 1
--agent 2 fe sprint 02 story 1
--agent 3 fe sprint 02 story 1

--agent -1 fe sprint 02 story 2
--agent 0 fe sprint 02 story 2
--agent 1 fe sprint 02 story 2
--agent 2 fe sprint 02 story 2
--agent 3 fe sprint 02 story 2

--agent -1 fe sprint 02 story 3
--agent 0 fe sprint 02 story 3
--agent 1 fe sprint 02 story 3
--agent 2 fe sprint 02 story 3
--agent 3 fe sprint 02 story 3

--agent -1 fe sprint 02 story 4
--agent 0 fe sprint 02 story 4
--agent 1 fe sprint 02 story 4
--agent 2 fe sprint 02 story 4
--agent 3 fe sprint 02 story 4

--agent -1 fe sprint 02 story 5
--agent 0 fe sprint 02 story 5
--agent 1 fe sprint 02 story 5
--agent 2 fe sprint 02 story 5
--agent 3 fe sprint 02 story 5
```

**Stories:**  
1. Install React Query + Provider  
2. API SDK extraction (centralize all endpoints)  
3. Migrate matches to React Query (useQuery + useMutation)  
4. Migrate conversations to React Query  
5. Migrate profile to React Query

**Launch priority:** Story 1-3 (matches) are **recommended** before launch. Story 4-5 (conversations, profile) can be deferred.

---

## FE Sprint 03 — Socket Token Auth

**P0 BLOCKER:** Real-time messaging won't work on mobile without this.

```text
--agent -1 fe sprint 03 story 1
--agent 0 fe sprint 03 story 1
--agent 1 fe sprint 03 story 1
--agent 2 fe sprint 03 story 1
--agent 3 fe sprint 03 story 1

--agent -1 fe sprint 03 story 2
--agent 0 fe sprint 03 story 2
--agent 1 fe sprint 03 story 2
--agent 2 fe sprint 03 story 2
--agent 3 fe sprint 03 story 2
```

**Stories:**  
1. Backend socket token validation (accept token in handshake)  
2. Frontend socket token injection (send token, handle refresh)

---

## FE Sprint 04 — Component Cleanup (Optional Polish)

**P2 OPTIONAL:** Can launch without. Improves maintainability and mobile performance, but not critical.

```text
--agent -1 fe sprint 04 story 1
--agent 0 fe sprint 04 story 1
--agent 1 fe sprint 04 story 1
--agent 2 fe sprint 04 story 1
--agent 3 fe sprint 04 story 1

--agent -1 fe sprint 04 story 2
--agent 0 fe sprint 04 story 2
--agent 1 fe sprint 04 story 2
--agent 2 fe sprint 04 story 2
--agent 3 fe sprint 04 story 2

--agent -1 fe sprint 04 story 3
--agent 0 fe sprint 04 story 3
--agent 1 fe sprint 04 story 3
--agent 2 fe sprint 04 story 3
--agent 3 fe sprint 04 story 3
```

**Stories:**  
1. Split hook gods (`use-conversation-messages` → smaller hooks)  
2. Form validation extraction (shared utilities + `useForm` hook)  
3. Admin page simplification (optional, skip for launch)

**Recommendation:** Skip for Android launch. Defer to post-launch.

---

## Summary: What to Run for Android Launch

### P0 (Must-Have)

1. **FE-01 (Mobile Auth)** — Stories 1-4
2. **FE-03 (Socket Auth)** — Stories 1-2

### P1 (Strongly Recommended)

3. **FE-02 (React Query)** — Stories 1-3 (matches only)

### P2 (Optional, Defer to Post-Launch)

4. **FE-02 (React Query)** — Stories 4-5 (conversations, profile)
5. **FE-04 (Component Cleanup)** — All stories

---

## Parallel Execution

**Can run in parallel:**
- FE-01 Story 1 (backend auth) + FE-03 Story 1 (backend socket)
- FE-01 Story 2-4 (frontend) + FE-02 Story 1-2 (React Query setup)

**Must run sequentially:**
- FE-01 Story 1 → FE-01 Story 2 → FE-01 Story 3
- FE-03 Story 1 → FE-03 Story 2

---

## See also

- [FE-01 README](./fe-sprint-01-mobile-auth/README.md)
- [FE-02 README](./fe-sprint-02-unified-data-layer/README.md)
- [FE-03 README](./fe-sprint-03-socket-token-auth/README.md)
- [FE-04 README](./fe-sprint-04-component-cleanup/README.md)
- [ANDROID_BACKEND_ROADMAP.md](./ANDROID_BACKEND_ROADMAP.md) (backend sprints 64-65)
