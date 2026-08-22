# Agent Commands — FE Sprint 01 (Mobile Auth)

Quick-reference commands for AI agents executing FE-01 stories.

**Pipeline paste (one at a time):** also listed in [FRONTEND_AGENT_COMMANDS.md](../FRONTEND_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

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

---

## Story descriptions

**Story 1:** Backend token endpoint + middleware (JWT, dual-mode auth)  
**Story 2:** Frontend auth context + token storage (AuthProvider, useAuth hook)  
**Story 3:** API client integration (Axios/fetch + token interceptor)  
**Story 4:** Platform detection + mobile stub (Capacitor or React Native)

---

## Order

Run **sequentially:** Story 1 → Story 2 → Story 3 → Story 4

---

## See also

- [README.md](./README.md) — Sprint overview
- [STORY_01_backend_token_endpoint.md](./STORY_01_backend_token_endpoint.md)
- [STORY_02_frontend_auth_context.md](./STORY_02_frontend_auth_context.md)
- [STORY_03_api_client_integration.md](./STORY_03_api_client_integration.md)
- [STORY_04_platform_mobile_stub.md](./STORY_04_platform_mobile_stub.md)
