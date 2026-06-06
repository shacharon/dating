# Sprint 5–7 Closeout Plan

**Goal:** Ship all remaining stories (9 engineering + 2 operator smokes) and close sprints 5, 6, and 7.  
**Status:** **12/12 engineering stories done** · operator smokes pending  
**Last updated:** 2026-06-03

---

## Done (no code work)

| Sprint | Story | What shipped |
|--------|-------|----------------|
| 5 | [1 WS prod smoke](./sprint-05-prod-stability/STORY_01_ws_prod_smoke_flag_flip.md) | Runbook + `NEXT_PUBLIC_REALTIME=ws` path |
| 5 | [2 Sentry](./sprint-05-prod-stability/STORY_02_sentry_structured_logging.md) | API + UI Sentry, PII scrub, 1255 tests |
| 6 | [1 Email notifications](./sprint-06-product-quality/STORY_01_email_push_notifications.md) | Resend/noop, mutual + message email, unsubscribe, migration |
| 7 | [1 Delete frozen legacy](./sprint-07-tech-debt/STORY_01_delete_frozen_legacy_paths.md) | Analyze POC removed, V2 chain gone, UI `/poc` removed |
| 7 | [2 Legacy cleanup](./sprint-07-tech-debt/STORY_02_legacy_retirement_cleanup.md) | Scripts archived, HG CI workflow removed, docs updated, 1262 tests |
| 6 | [2 EMOTIONAL_DEPTH_FLOOR](./sprint-06-product-quality/STORY_02_fix_emotional_depth_floor.md) | Directional mismatch ≥8 vs ≤2; balance bump removed; 1268 tests |
| 6 | [4 Values weight 15%](./sprint-06-product-quality/STORY_04_raise_values_alignment_weight.md) | Blend 0.30/0.30/0.25/0.15; `valuesAlignment` on compare DTO; 1270 tests |
| 5 | [3 LOW_INFO → coverage cap](./sprint-05-prod-stability/STORY_03_remove_low_info_profile_ids.md) | Sparse cap cov&lt;50% or minPresent≤5 → 55; no profile id hack; 1280 tests |
| 5 | [4 finalScore canonical](./sprint-05-prod-stability/STORY_04_consolidate_final_score.md) | `finalScore` only on wire; `resolveEngineFinalScore` legacy read; 1284 tests |
| 6 | [3 LLM derived context](./sprint-06-product-quality/STORY_03_llm_derived_context.md) | `derivedContext` v1 on evaluationJson; `resolveDerivedContext`; 1298 tests |
| 7 | [3 Redis WS rate limit](./sprint-07-tech-debt/STORY_03_redis_ws_rate_limit.md) | Shared `ws:ratelimit:*` via Lua; fail-open; `consumeInboundSlot`; 1303 tests |
| 7 | [4 Funnel analytics](./sprint-07-tech-debt/STORY_04_product_funnel_analytics.md) | `AnalyticsModule`, 8 `product_analytics` events, PII-safe logs; 1309 tests |

**Operator-only (not blocking closeout):**

- 5.1 Tier B prod WS smoke — [SMOKE_WS_PROD_RUNBOOK.md](./sprint-05-prod-stability/SMOKE_WS_PROD_RUNBOOK.md)
- 5.2 Sentry dashboard smoke — Story 2 manual smoke (`GET /health/sentry-test`)
- 6.1 Resend email smoke — Story 1 manual smoke section
- 7.1 Product smoke after legacy delete — Story 1 manual smoke section
- 7.4 Funnel log smoke — Story 4 manual smoke (`product_analytics` in logs)

---

## Remaining stories (agent-ready)

**None** — all 12 engineering stories in Sprints 5–7 are done.

---

## Recommended execution waves

### Wave A — Observability + repo hygiene (≈2–3 days)

1. ~~**5.2 Sentry**~~ — **Done** (unblocks 7.4)  
2. ~~**7.2 Legacy cleanup**~~ — **Done** — scripts archived, CI workflow removed, docs

### Wave B — Match engine quality (≈3–4 days)

3. ~~**6.2 EMOTIONAL_DEPTH_FLOOR**~~ — **Done**  
4. ~~**6.4 Values weight**~~ — **Done** — rankings shift documented in PM handoff  
5. ~~**5.3 Coverage cap**~~ — **Done** — sparse coverage cap replaces profile `19` hack  
6. ~~**5.4 finalScore**~~ — **Done** — `finalScore` canonical; breaking field removal documented  

### Wave C — Extraction + scale + product data (≈4–5 days)

7. ~~**6.3 LLM context fields**~~ — **Done** — `derivedContext` v1; LLM-first + regex fallback  
8. ~~**7.3 Redis WS rate limit**~~ — **Done** — shared limit via Redis; fail-open on errors  
9. ~~**7.4 Funnel analytics**~~ — **Done** — `AnalyticsModule`, structured log funnel events  

---

## Agent commands (copy-paste)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`  
Run **one agent at a time** per story: `0 → 1 → 2 → 3`.

```text
--agent 0 sprint 5 story 2
--agent 1 sprint 5 story 2
--agent 2 sprint 5 story 2
--agent 3 sprint 5 story 2

--agent 0 sprint 7 story 2
--agent 1 sprint 7 story 2
--agent 2 sprint 7 story 2
--agent 3 sprint 7 story 2

--agent 0 sprint 6 story 2
--agent 1 sprint 6 story 2
--agent 2 sprint 6 story 2
--agent 3 sprint 6 story 2

--agent 0 sprint 6 story 4
--agent 1 sprint 6 story 4
--agent 2 sprint 6 story 4
--agent 3 sprint 6 story 4

--agent 0 sprint 5 story 3
--agent 1 sprint 5 story 3
--agent 2 sprint 5 story 3
--agent 3 sprint 5 story 3

--agent 0 sprint 5 story 4
--agent 1 sprint 5 story 4
--agent 2 sprint 5 story 4
--agent 3 sprint 5 story 4

--agent 0 sprint 6 story 3
--agent 1 sprint 6 story 3
--agent 2 sprint 6 story 3
--agent 3 sprint 6 story 3

--agent 0 sprint 7 story 3
--agent 1 sprint 7 story 3
--agent 2 sprint 7 story 3
--agent 3 sprint 7 story 3

--agent 0 sprint 7 story 4
--agent 1 sprint 7 story 4
--agent 2 sprint 7 story 4
--agent 3 sprint 7 story 4
```

Handoffs land in: `docs/sprints/sprint-0N-*/handoffs/<story-slug>/agent-*.md`

---

## End-to-end smoke (after all waves)

Run once when Wave C is complete:

1. `cd dating-api && npx prisma migrate deploy && npm test`  
2. `cd dating-ui && npm test && npm run build`  
3. Login → matches → like → mutual → conversation → message (WS + poll)  
4. Sentry: trigger test error with DSN set → event visible  
5. Rebuild matches: no profile-id cap; coverage cap only  
6. Match list shows `finalScore` only  
7. `npm run` — no scripts that `exit(1)` DEPRECATED  

---

## Sprint close criteria

| Sprint | Close when |
|--------|------------|
| **5** | 2–4 done + Story 1 operator smoke signed off |
| **6** | 2–4 done + Story 1 Resend smoke (or noop documented) |
| **7** | 2–4 done + Story 1 product smoke signed off |

Update each sprint `README.md` status to **Complete** when its stories are done.

---

## Story index

### Sprint 5 — [README](./sprint-05-prod-stability/README.md)

| # | File | Status |
|---|------|--------|
| 1 | [STORY_01](./sprint-05-prod-stability/STORY_01_ws_prod_smoke_flag_flip.md) | Done |
| 2 | [STORY_02](./sprint-05-prod-stability/STORY_02_sentry_structured_logging.md) | Done |
| 3 | [STORY_03](./sprint-05-prod-stability/STORY_03_remove_low_info_profile_ids.md) | **Done** |
| 4 | [STORY_04](./sprint-05-prod-stability/STORY_04_consolidate_final_score.md) | **Done** |

### Sprint 6 — [README](./sprint-06-product-quality/README.md)

| # | File | Status |
|---|------|--------|
| 1 | [STORY_01](./sprint-06-product-quality/STORY_01_email_push_notifications.md) | Done |
| 2 | [STORY_02](./sprint-06-product-quality/STORY_02_fix_emotional_depth_floor.md) | **Done** |
| 3 | [STORY_03](./sprint-06-product-quality/STORY_03_llm_derived_context.md) | **Done** |
| 4 | [STORY_04](./sprint-06-product-quality/STORY_04_raise_values_alignment_weight.md) | **Done** |

### Sprint 7 — [README](./sprint-07-tech-debt/README.md)

| # | File | Status |
|---|------|--------|
| 1 | [STORY_01](./sprint-07-tech-debt/STORY_01_delete_frozen_legacy_paths.md) | Done |
| 2 | [STORY_02](./sprint-07-tech-debt/STORY_02_legacy_retirement_cleanup.md) | **Done** |
| 3 | [STORY_03](./sprint-07-tech-debt/STORY_03_redis_ws_rate_limit.md) | **Done** |
| 4 | [STORY_04](./sprint-07-tech-debt/STORY_04_product_funnel_analytics.md) | **Done** |

---

## Dev prerequisites (all stories)

```powershell
# API
cd dating-api
npx prisma migrate deploy
npm run start:dev:ready

# UI
cd dating-ui
npm run dev
```

Ensure `.env.local`: `API_PROXY_TARGET=http://127.0.0.1:3001`, `NEXT_PUBLIC_REALTIME=ws` (or `poll` for stable local dev).
