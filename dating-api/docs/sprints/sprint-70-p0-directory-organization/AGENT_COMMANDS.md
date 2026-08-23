# Agent Commands — Sprint 70 (P0 Directory Organization)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

```text
--agent -1 sprint 70 story 1
--agent 0 sprint 70 story 1
--agent 1 sprint 70 story 1
--agent 2 sprint 70 story 1
--agent 3 sprint 70 story 1

--agent -1 sprint 70 story 2
--agent 0 sprint 70 story 2
--agent 1 sprint 70 story 2
--agent 2 sprint 70 story 2
--agent 3 sprint 70 story 2
```

---

## Story 01 — matches/

```powershell
(Get-ChildItem -LiteralPath dating-api\src\matches -File).Count
Get-ChildItem -LiteralPath dating-api\src\matches -Directory | Select-Object Name
rg "from '\\.\\./matches/" dating-api/src --glob "*.ts" | Measure-Object
rg "from '\\./" dating-api/src/matches --glob "*.ts" | Measure-Object
```

---

## Story 02 — me-profile/

```powershell
(Get-ChildItem -LiteralPath dating-api\src\me-profile -File).Count
Get-ChildItem -LiteralPath dating-api\src\me-profile -Directory | Select-Object Name
rg "from '\\.\\./me-profile/" dating-api/src --glob "*.ts" | Measure-Object
```

---

## Verify

```powershell
cd dating-api
npm run build
npm test

(Get-ChildItem -LiteralPath src\matches -File).Count
(Get-ChildItem -LiteralPath src\me-profile -File).Count
Test-Path src\matches\README.md
Test-Path src\me-profile\README.md
```
