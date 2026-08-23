# Sprint 72 — P1 Mapper + Remaining Thin Services (Preview)

**Status:** Planned (after Sprint 71)  
**Depends on:** Sprint 71 Done  
**Repo:** `dating-api`

---

## Goal

Tackle the next P1 tier: god **mapper** + services in the 200–348 LOC range.

---

## Stories (draft)

| # | Target | LOC | Approach |
|---|--------|-----|----------|
| 01 | `profile-to-canonical.mapper.ts` | 704 | Split by input slice: `rankingSignals`, `structuredFacts`, `structuredPreferences`, `searchOverrides` + thin `mapProfileToCanonical()` orchestrator |
| 02 | `extraction.service.ts` | 348 | Already partially decomposed — extract retry/telemetry if still mixed |
| 03 | `admin-match-quality.service.ts` | 348 | Split query vs export vs candidate audit |
| 04 | Batch thin pass | 200–305 | `me-conversation-messages`, `me-profile-analysis`, `photo-moderation`, `messaging-socket-registry` — one story each only if still >250 after quick extract |

---

## Mapper split preview

```
holy-grail-matching/canonical-mapper/
  profile-to-canonical.mapper.ts          # orchestrator ≤150 LOC
  map-ranking-signals.slice.ts
  map-structured-facts.slice.ts
  map-structured-preferences.slice.ts
  map-search-overrides.slice.ts
  canonical-mapper.validation.ts          # assertPlainRecord, assertNoExtraKeys shared
```

**Freeze policy:** No new regex/keywords in mapper splits — move code only ([NO_NEW_REGEX_POLICY.md](../sprint-52-keyword-engine-freeze/NO_NEW_REGEX_POLICY.md)).

---

## Success (when executed)

- [ ] No mapper file >200 LOC; no function >80 LOC
- [ ] Services 200–348 LOC reduced to ≤250 or documented accept list
- [ ] All HG + extraction tests green

**Agent commands:** to be added when Sprint 71 closes.
