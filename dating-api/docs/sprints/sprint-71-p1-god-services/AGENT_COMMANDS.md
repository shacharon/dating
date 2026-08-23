# Agent Commands — Sprint 71 (P1 God Services)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

```text
--agent -1 sprint 71 story 1
--agent 0 sprint 71 story 1
--agent 1 sprint 71 story 1
--agent 2 sprint 71 story 1
--agent 3 sprint 71 story 1

--agent -1 sprint 71 story 2
--agent 0 sprint 71 story 2
--agent 1 sprint 71 story 2
--agent 2 sprint 71 story 2
--agent 3 sprint 71 story 2

--agent -1 sprint 71 story 3
--agent 0 sprint 71 story 3
--agent 1 sprint 71 story 3
--agent 2 sprint 71 story 3
--agent 3 sprint 71 story 3

--agent -1 sprint 71 story 4
--agent 0 sprint 71 story 4
--agent 1 sprint 71 story 4
--agent 2 sprint 71 story 4
--agent 3 sprint 71 story 4
```

---

## Story 01 — match-ranking

```powershell
(Get-Content -LiteralPath dating-api\src\me-profile\matches\list\ranking\match-ranking.service.ts | Measure-Object -Line).Lines
rg "buildFullRankedList" dating-api/src/me-profile/matches --glob "*.ts"
npm test -- match-ranking match-list-candidate-scorer match-ranking-spec-size
npm test -- me-matches match-list-rank
```

---

## Story 02 — matches.service (admin/legacy)

```powershell
(Get-Content -LiteralPath dating-api\src\matches\matches.service.ts | Measure-Object -Line).Lines
rg "MatchesService" dating-api/src/matches --glob "*.ts"
npm test -- matches.service matches-api-smoke matches-spec-size
```

---

## Story 03 — me-conversations

```powershell
(Get-Content -LiteralPath dating-api\src\me-profile\conversations\me-conversations.service.ts | Measure-Object -Line).Lines
rg "MeConversationsService" dating-api/src/me-profile --glob "*.ts"
npm test -- me-conversations me-conversations-spec-size
```

---

## Story 04 — match-detail

```powershell
(Get-Content -LiteralPath dating-api\src\me-profile\matches\detail\match-detail.service.ts | Where-Object { $_.Trim() -ne '' } | Measure-Object).Count
rg "MatchDetailService" dating-api/src/me-profile --glob "*.ts"
npm test -- match-detail match-detail-spec-size match-repository-wiring
```

---

## Full verify

```powershell
cd dating-api
npm run build
npm test

@(
  'me-profile\matches\list\ranking\match-ranking.service.ts',
  'matches\matches.service.ts',
  'me-profile\conversations\me-conversations.service.ts',
  'me-profile\matches\detail\match-detail.service.ts'
) | ForEach-Object {
  $p = Join-Path 'src' $_
  $n = (Get-Content -LiteralPath $p | Measure-Object -Line).Lines
  "$n $_"
}
```
