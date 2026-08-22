# Agent Commands — Sprint 65 (Test Velocity)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

```text
--agent -1 sprint 65 story 1
--agent 0 sprint 65 story 1
--agent 1 sprint 65 story 1
--agent 2 sprint 65 story 1
--agent 3 sprint 65 story 1

--agent -1 sprint 65 story 2
--agent 0 sprint 65 story 2
--agent 1 sprint 65 story 2
--agent 2 sprint 65 story 2
--agent 3 sprint 65 story 2

--agent -1 sprint 65 story 3
--agent 0 sprint 65 story 3
--agent 1 sprint 65 story 3
--agent 2 sprint 65 story 3
--agent 3 sprint 65 story 3
```

---

## Story 01 — Extraction spec

```bash
(Get-Content dating-api\src\extraction\extraction.service.spec.ts | Measure-Object -Line).Lines
rg "describe\(" dating-api/src/extraction/extraction.service.spec.ts
```

---

## Story 02 — Match-engine spec

```bash
(Get-Content dating-api\src\matches\match-engine.spec.ts | Measure-Object -Line).Lines
rg "describe\(" dating-api/src/matches/match-engine.spec.ts
```

---

## Story 03 — Optional others

```bash
Get-ChildItem dating-api\src -Recurse -Include "*.spec.ts" | ForEach-Object { $n = (Get-Content $_.FullName | Measure-Object -Line).Lines; if ($n -ge 1000) { "$n $($_.Name)" } } | Sort-Object { [int]($_ -split ' ')[0] } -Descending
```

---

## Verify

```bash
cd dating-api && npm test
# Measure CI time before/after
```
