# Agent Commands — FE Sprint 02 (Unified Data Layer)

Quick-reference commands for AI agents executing FE-02 stories.

**Pipeline paste (one at a time):** also listed in [FRONTEND_AGENT_COMMANDS.md](../FRONTEND_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

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

---

## Story descriptions

**Story 1:** Install React Query + Provider  
**Story 2:** API SDK extraction (centralize all endpoints)  
**Story 3:** Migrate matches to React Query (`useInfiniteQuery` + match action mutations)  
**Story 4:** Migrate conversation messages to React Query (`useQuery` thread + optimistic send)  
**Story 5:** Migrate profile to React Query (`useProfile` + `usePatchProfile` / `useCreateProfile` / `useSubmitProfileForAnalysis`)

---

## Order

Run **sequentially:** Story 1 → Story 2 → Story 3 → Story 4 → Story 5

---

## Launch Priority

**P0 (must-have):** Story 1-3 (matches)  
**P1 (nice-to-have):** Story 4-5 (conversations, profile)

---

## See also

- [README.md](./README.md) — Sprint overview
