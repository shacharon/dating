# Agent Commands — Sprint 69 (P0 Test Splitting)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

```text
--agent -1 sprint 69 story 1
--agent 0 sprint 69 story 1
--agent 1 sprint 69 story 1
--agent 2 sprint 69 story 1
--agent 3 sprint 69 story 1

--agent -1 sprint 69 story 2
--agent 0 sprint 69 story 2
--agent 1 sprint 69 story 2
--agent 2 sprint 69 story 2
--agent 3 sprint 69 story 2

--agent -1 sprint 69 story 3
--agent 0 sprint 69 story 3
--agent 1 sprint 69 story 3
--agent 2 sprint 69 story 3
--agent 3 sprint 69 story 3

--agent -1 sprint 69 story 4
--agent 0 sprint 69 story 4
--agent 1 sprint 69 story 4
--agent 2 sprint 69 story 4
--agent 3 sprint 69 story 4
```

---

## Story 01 — compute-friction

```powershell
(Get-Content -LiteralPath dating-api\src\engine\compute-friction.spec.ts | Measure-Object -Line).Lines
rg "describe\(" dating-api/src/engine/compute-friction.spec.ts
```

---

## Story 02 — me-profile HTTP remaining

```powershell
(Get-Content -LiteralPath dating-api\src\me-profile\me-profile-http-crud.integration.spec.ts | Measure-Object -Line).Lines
(Get-Content -LiteralPath dating-api\src\me-profile\me-profile-http-conversations.integration.spec.ts | Measure-Object -Line).Lines
rg "describe\(" dating-api/src/me-profile/me-profile-http-crud.integration.spec.ts
rg "describe\(" dating-api/src/me-profile/me-profile-http-conversations.integration.spec.ts
```

---

## Story 03 — me-profile.service.spec

```powershell
(Get-Content -LiteralPath dating-api\src\me-profile\me-profile.service.spec.ts | Measure-Object -Line).Lines
rg "describe\(" dating-api/src/me-profile/me-profile.service.spec.ts
```

---

## Story 04 — evaluate + eligibility harness

```powershell
(Get-Content -LiteralPath dating-api\src\evaluate\evaluate.service.spec.ts | Measure-Object -Line).Lines
(Get-Content -LiteralPath dating-api\src\me-profile\me-matches-eligibility.spec-support.ts | Measure-Object -Line).Lines
rg "describe\(" dating-api/src/evaluate/evaluate.service.spec.ts
```

---

## Verify

```powershell
cd dating-api; npm test

Get-ChildItem dating-api\src -Recurse -Include "*.spec.ts" | ForEach-Object {
  $n = (Get-Content -LiteralPath $_.FullName | Measure-Object -Line).Lines
  if ($n -ge 1000) { "$n $($_.FullName)" }
} | Sort-Object { [int]($_ -split ' ')[0] } -Descending
```
