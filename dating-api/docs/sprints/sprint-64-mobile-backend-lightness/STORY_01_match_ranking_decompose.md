# Story 01 — Decompose Match-Ranking Service

**Sprint:** 64  
**Effort:** 3–4 days  
**Risk:** ⚠️ MEDIUM (hot product path)  
**Status:** Blocked (Agent 4 E2E pending)

---

## Objective

Split `match-ranking.service.ts` (544 LOC) into focused collaborators so `/me/matches` is easy to debug and extend for mobile features.

---

## Current State

**What it does:**
- Loads viewer context + candidate pool
- Applies eligibility filters
- Scores pairs via policy
- Handles HG hard-fail gates
- Assembles + persists rank snapshot
- Match list analytics
- Dealbreaker telemetry

**Why it's fat:** Everything in one method (`buildFullRankedList` ~400 LOC of the file).

---

## Design

```typescript
// match-ranking/
  ranking-load.service.ts          // Load viewer + candidates
  ranking-scorer.service.ts        // Score loop + policy
  ranking-assemble.service.ts      // Build DTO + persist
  ranking-telemetry.service.ts     // Analytics + dealbreaker logs

// match-ranking.service.ts (thin)
constructor(
  private loader: RankingLoadService,
  private scorer: RankingScorerService,
  private assembler: RankingAssembleService,
  private telemetry: RankingTelemetryService,
) {}

async buildFullRankedList(userId) {
  const context = await this.loader.load(userId);
  const scored = await this.scorer.score(context);
  const result = await this.assembler.assemble(scored);
  await this.telemetry.track(result);
  return result;
}
```

---

## Tasks

1. Extract loader (viewer + candidate queries via repos)
2. Extract scorer (policy + HG gates + photo eligibility)
3. Extract assembler (DTO map + rank snapshot persist)
4. Extract telemetry (analytics + dealbreaker logging)
5. Thin main service to 150-200 LOC orchestration
6. Specs: ranking.service.spec stays integration-style; add unit specs for collaborators

---

## Mobile Win

**Before:** 544-line file  
**After:** ~150 orchestrator + 4 focused files  
**Debug trace:** Load → Score → Assemble (3 clear steps)

---

## Success

- [x] Match-ranking ≤ ~250 LOC (façade 107 LOC on `feature/sprint-64-story-1`)
- [x] Collaborators independently testable (4 services + unit specs; 39 tests pass)
- [x] `/me/matches` endpoint trace clean (Load → Score → Assemble → Telemetry)
- [ ] Specs green — unit ✅; E2E baselines red (Agent 4 required)
