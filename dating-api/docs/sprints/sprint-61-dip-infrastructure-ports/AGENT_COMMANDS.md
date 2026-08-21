# Agent Commands — Sprint 61 (DIP Infrastructure Ports)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

```text
--agent -1 sprint 61 story 1
--agent 0 sprint 61 story 1
--agent 1 sprint 61 story 1
--agent 2 sprint 61 story 1
--agent 3 sprint 61 story 1

--agent -1 sprint 61 story 2
--agent 0 sprint 61 story 2
--agent 1 sprint 61 story 2
--agent 2 sprint 61 story 2
--agent 3 sprint 61 story 2

--agent -1 sprint 61 story 3
--agent 0 sprint 61 story 3
--agent 1 sprint 61 story 3
--agent 2 sprint 61 story 3
--agent 4 sprint 61 story 3
--agent 3 sprint 61 story 3
```

**Order per story:** `-1 → 0 → 1 → 2 → (4 on S3) → 3`  
**Depends on:** Tracks 1–2 done; prefer Sprint 57 merged if enrichment still monolithic.

---

## Story 01 — Redis + cache ISP

```bash
# Find fat Redis injectors
rg "RedisCacheService" dating-api/src --type ts -g "*.service.ts" -g "*.cron.ts"

# Find client construction
rg "createClient" dating-api/src/cache dating-api/src/me-profile dating-api/src/messaging-realtime --type ts
```

**Do:** Add `cache.ports.ts`; Nest tokens `CACHE_KV` / `CACHE_SETS` / `CRON_LOCK`; migrate 5 consumers; shared Redis provider.

**Verify:** match-list-cache, socket-registry, email-debounce, cron specs.

---

## Story 02 — Rate-limit DI

```bash
rg "createClient|new RedisMessage|new MemoryMessage|new RedisWs|new MemoryWs" dating-api/src --type ts
```

**Do:** Module factories for message + WS stores; inject store interfaces; share Redis client from S1 when possible.

**Verify:** conversation-message-rate-limit + messaging-ws-rate-limit specs.

---

## Story 03 — Moderation ports

```bash
rg "OpenAIModerationClient|RekognitionClient" dating-api/src --type ts
```

**Do:** `CONTENT_MODERATION` port; Nest `RekognitionPort`; remove constructor AWS `new`.

**Verify:** me-conversation-messages, profile-moderation, photo-moderation specs.

---

## Full sprint verify

```bash
cd dating-api && npm test
```

**Success:** DIP for Redis/rate-limit/moderation; no behavior change in product policies.
