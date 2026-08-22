# Sprint 66 — Optional Polish (HG Extracts + Frozen Data)

**Status:** Optional  
**Depends on:** Sprints 64-65 Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 4 (Android prep — optional, not blocking)

---

## Goal

Polish remaining large files that are mostly frozen data, not hot business logic.

**DO THIS ONLY IF:** You have time and want perfection. **NOT BLOCKING** for Android app.

---

## Files (All ≥300 LOC, mostly data/rules)

| LOC | File | Type |
|-----|------|------|
| 761 | `dealbreaker-signals-text.extract.ts` | HG keyword dump |
| 721 | `engine/tension-rules.ts` | Rule table |
| 704 | `holy-grail-matching/profile-to-canonical.mapper.ts` | Mapper |
| 600 | `llm/openai/openai.client.ts` | SDK adapter |
| 549 | `matches/match-explainability.ts` | Chip labels |
| 512 | `matches/match-teaser.ts` | Display logic |

**These are NOT "god services"** — they're data tables, keyword vocabularies, display formatters.

---

## Stories (All Optional)

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Split dealbreaker extract by family](./STORY_01_dealbreaker_families.md) | 2 days | ⚡ LOW | Optional |
| 02 | [Split tension-rules by domain](./STORY_02_tension_domains.md) | 1 day | ⚡ LOW | Optional |
| 03 | [Thin OpenAI client + profile mapper](./STORY_03_client_mapper_thin.md) | 2 days | ⚡ LOW | Optional |

---

## My Honest Take

**DON'T DO Sprint 66 for mobile launch.**

These files are:
- ✅ Frozen data (Sprint 52 policy)
- ✅ Not hot paths (HG is optional feature)
- ✅ Easy to navigate (vocabulary dumps)

**Your backend is already mobile-ready after Sprints 64-65.**

Only do Sprint 66 if:
- You're bored waiting for Android team
- You want to prove you can get EVERY file <500 LOC
- Your OCD demands it

---

## Recommendation

**Stop after Sprint 65.** Ship the Android app. Come back to Sprint 66 later if you want.
