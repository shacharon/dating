# Agent Commands — Sprint 64 (Mobile Backend Lightness)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

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

**Order per story:** `-1 → 0 → 1 → 2 → (4 on S3) → 3`

---

## Story 01 — Match-ranking decompose

```bash
(Get-Content dating-api\src\me-profile\matches\match-ranking.service.ts | Measure-Object -Line).Lines
rg "buildFullRankedList" dating-api/src/me-profile/matches --type ts
```

**Do:** Extract load → score → assemble → telemetry collaborators; thin main service to ≤250.

---

## Story 02 — Legacy matches cleanup

```bash
rg "matches\.service" dating-api/src/matches --type ts
rg "MatchesService" dating-api/src --type ts -g "*.controller.ts"
```

**Do:** Option A (deprecate + quarantine to admin-legacy/) or Option B (migrate to repos).

---

## Story 03 — Final Prisma peel

```bash
rg "PrismaService" dating-api/src --type ts -g "*.service.ts"
(Get-Content dating-api\src\me-profile\repositories\prisma-match.repository.ts | Measure-Object -Line).Lines
```

**Do:** Peel narrative-cache + WS-session; evaluate match repo adapter size.

---

## Full sprint verify

```bash
cd dating-api && npm test
(Get-Content dating-api\src\me-profile\matches\match-ranking.service.ts | Measure-Object -Line).Lines
rg "PrismaService" dating-api/src --type ts -g "*.service.ts" | Measure-Object | Select-Object -ExpandProperty Count
```
