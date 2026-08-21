# Agent Commands — Sprint 63 (Finish Round 3 Leftovers)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

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

**Order per story:** `-1 → 0 → 1 → 2 → (4 on S4) → 3`  
**Order of stories:** 01 → 02 → 03 → 04

---

## Story 01 — Enrichment + hygiene

```bash
(Get-Content dating-api\src\evaluate\enrichment-v2.ts | Measure-Object -Line).Lines
git branch -a | Select-String "sprint-57"
rg "RedisCacheService" dating-api/src --type ts -g "*.module.ts"
rg "me-conversations-.*-batch" dating-api/src --type ts
```

**Do:** Merge/verify Sprint 57 on main; drop unused Redis export; delete batch re-export shims.

---

## Story 02 — Split HTTP specs

```bash
(Get-Content dating-api\src\me-profile\me-profile-http.integration.spec.ts | Measure-Object -Line).Lines
rg "describe\(" dating-api/src/me-profile/me-profile-http.integration.spec.ts
```

**Do:** Shared harness + split by crud / photos / matches / conversations.

---

## Story 03 — Prisma peel

```bash
rg "PrismaService" dating-api/src --type ts -g "*.service.ts"
rg "this\.prisma\." dating-api/src/me-profile/me-profile-analysis.service.ts dating-api/src/me-profile/me-match-feedback.service.ts dating-api/src/me-account --type ts
```

**Do:** Extend existing repos; migrate analysis → feedback → account (if in scope).

---

## Story 04 — Match ISP + rate-limit

```bash
rg "Prisma\.(UserProfileSelect|UserProfileWhereInput)" dating-api/src/me-profile/repositories --type ts
rg "rate-limit" dating-api/src/me-profile dating-api/src/messaging-realtime -g "*rate-limit*" --files-with-matches
```

**Do:** Split match port / remove Prisma leaks; shared sliding-window store for HTTP+WS.

---

## Full sprint verify

```bash
cd dating-api && npm test
(Get-Content dating-api\src\evaluate\enrichment-v2.ts | Measure-Object -Line).Lines
rg "PrismaService" dating-api/src --type ts -g "*.service.ts" | Measure-Object | Select-Object -ExpandProperty Count
```
