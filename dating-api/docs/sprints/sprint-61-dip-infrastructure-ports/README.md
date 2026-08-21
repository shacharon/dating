# Sprint 61 — DIP Infrastructure Ports (Track 3)

**Status:** Done  
**Depends on:** Sprints 57–60 Done (or 58–60 on main; merge 57 if enrichment still fat)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 3 (post Track 1+2 checkpoint)

---

## Goal

Stop high-level services from owning Redis / AWS / OpenAI SDK construction. Wire infrastructure behind Nest tokens (ISP + DIP), matching existing patterns (`PHOTO_STORAGE`, `EmailProvider`, `LLMClient`).

**Non-goals:** New product behavior; repository extraction (Sprint 62); changing rate-limit thresholds or moderation policies.

---

## Checkpoint (why now)

| Metric | Pre Track 1+2 | After Track 1+2 (main) | After Story 01 |
|--------|---------------|-------------------------|----------------|
| `evaluate.service.ts` | ~695 LOC | **~132** ✅ | — |
| `extraction.service.ts` | ~797 LOC | **~348** ✅ | — |
| `enrichment-v2.ts` | ~884 LOC | **~889** ⚠️ merge Sprint 57 if still on feature branch | — |
| Sprint 60 duplication | open | Done ✅ | — |
| Prisma injectors | ~28–29 | **~29** (unchanged — Track 4) | — |
| Fat `RedisCacheService` injectors | 5 | **5** | **0** (ports: `CACHE_KV` / `CACHE_SETS` / `CRON_LOCK`) ✅ |

---

## Problems Solved

| Issue | Today | After Sprint 61 |
|-------|-------|-----------------|
| Fat Redis wrapper | One class = KV + sets + cron lock | Segregated ports / tokens |
| Rate-limit `createClient` / `new` in services | Message + WS services own Redis | Nest factory binds store |
| Rekognition in constructor | `new RekognitionClient` inside service | `RekognitionPort` Nest provider |
| Concrete moderation client | Messaging/profile inject `OpenAIModerationClient` | `CONTENT_MODERATION` port |

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Redis connection + cache ISP](./STORY_01_redis_cache_isp.md) | 2–3 days | ⚠️ MEDIUM | Done |
| 02 | [Rate-limit store DI](./STORY_02_rate_limit_di.md) | 1–2 days | ⚡ LOW | Done |
| 03 | [Moderation ports (text + Rekognition)](./STORY_03_moderation_ports.md) | 2 days | ⚠️ MEDIUM | Done |

**Order:** 01 → 02 → 03 (02 can overlap late 01 if shared Redis provider exists).

**Preferred merge tip:** `feature/sprint-61-story-3`

---

## Success criteria

- [x] No `createClient` / `new Redis*` inside message or WS rate-limit services *(Story 02)*
- [x] Product code injects cache **ports** (or narrow tokens), not only fat `RedisCacheService` API surface for new call sites *(Story 01)*
- [x] Messaging + profile moderation depend on a moderation **port**, not OpenAI concrete class *(Story 03)*
- [x] Photo moderation uses Nest-provided `RekognitionPort` (no constructor `new RekognitionClient` as default wiring) *(Story 03)*
- [x] Existing specs green for sprint scope (match-list cache, WS presence, rate limits, photo moderation, message send moderation) — unrelated match-list harness `matchListRank` mock gap noted in Story 03 close

---

## Out of scope (Sprint 62)

Prisma repositories for Match / Conversation / Violations / Profile photos.
