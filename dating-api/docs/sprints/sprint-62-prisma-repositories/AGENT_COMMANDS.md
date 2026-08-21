# Agent Commands — Sprint 62 (Prisma Repositories)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).  
**Depends on:** Sprint 61 Done.

---

## Paste commands (Cursor)

```text
--agent -1 sprint 62 story 1
--agent 0 sprint 62 story 1
--agent 1 sprint 62 story 1
--agent 2 sprint 62 story 1
--agent 3 sprint 62 story 1

--agent -1 sprint 62 story 2
--agent 0 sprint 62 story 2
--agent 1 sprint 62 story 2
--agent 2 sprint 62 story 2
--agent 3 sprint 62 story 2

--agent -1 sprint 62 story 3
--agent 0 sprint 62 story 3
--agent 1 sprint 62 story 3
--agent 2 sprint 62 story 3
--agent 3 sprint 62 story 3

--agent -1 sprint 62 story 4
--agent 0 sprint 62 story 4
--agent 1 sprint 62 story 4
--agent 2 sprint 62 story 4
--agent 4 sprint 62 story 4
--agent 3 sprint 62 story 4
```

**Order per story:** `-1 → 0 → 1 → 2 → (4 on S4) → 3`

---

## Story 01 — Match repo

```bash
rg "this\.prisma\." dating-api/src/me-profile/matches dating-api/src/me-profile/me-match-actions.service.ts --type ts
```

**Do:** Port from real call sites; `PrismaMatchRepository`; migrate ranking → actions → detail/query.  
**Do not:** expand ornamental POC `MatchesRepository`.

---

## Story 02 — Conversation / message repo

```bash
rg "this\.prisma\." dating-api/src/me-profile/me-conversations.service.ts dating-api/src/me-profile/me-conversation-messages.service.ts --type ts
```

**Do:** Persist-only repository; keep realtime/email/moderation in services.

---

## Story 03 — Violations + reports

```bash
rg "this\.prisma\." dating-api/src/content-moderation/content-violation.service.ts dating-api/src/reports dating-api/src/admin/admin-content-violations dating-api/src/admin/admin-reports --type ts
```

---

## Story 04 — Profile photos

```bash
rg "this\.prisma\." dating-api/src/me-profile/profile/profile-photo.service.ts dating-api/src/admin/admin-photos --type ts
```

---

## Full sprint verify

```bash
cd dating-api && npm test
# Soft success: fewer PrismaService injectors in me-profile + moderation
rg "PrismaService" dating-api/src --type ts -g "*.service.ts" -c
```
