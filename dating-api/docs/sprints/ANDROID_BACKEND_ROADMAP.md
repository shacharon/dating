# Android Backend Prep — Complete Roadmap

**Goal:** Clean, fast, maintainable backend for Android dating app.

**Status after Sprint 63:** 95% there  
**Remaining work:** Sprints 64-65 (required), 66 (optional polish)

---

## Current State (Post-Sprint 63)

### ✅ Major Wins

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Enrichment god file | 884 LOC | **37 LOC** | ✅ Split into modules |
| Evaluate god service | 695 LOC | **132 LOC** | ✅ Thin orchestrator |
| Extraction god service | 797 LOC | **348 LOC** | ✅ Collaborators |
| Prisma coupling | 28 services | **8 services** | ✅ -71% |
| DIP violations | Many | **Zero** | ✅ All ported |
| Giant HTTP test | 6183 LOC | **Split (4 files)** | ✅ |
| Match ISP | Leaked Prisma | **Clean facets** | ✅ |

### 🟡 Remaining Issues

| Issue | LOC | Impact on Android |
|-------|-----|-------------------|
| Match-ranking service | 544 | Hard to debug `/me/matches` |
| Legacy matches.service | 503 + Prisma | Confusing dual stacks |
| Giant test specs | 3160, 3079 | Slow CI |
| 6 Prisma services left | - | DB migration risk |

---

## Sprint 64 — Mobile Backend Lightness (REQUIRED)

**Effort:** 1.5-2 weeks  
**Priority:** P0 for Android launch

### Story 1: Decompose match-ranking (544 → ~200 LOC)

**Why:** `/me/matches` is your main Android endpoint. 544 LOC makes debugging hard.

**Split into:**
- Loader (candidates + context)
- Scorer (policy + HG gates)
- Assembler (DTO + persist)
- Telemetry (analytics)

**Mobile win:** Clean stack trace, easy to add mobile-specific features.

### Story 2: Deprecate legacy matches.service

**Why:** Two match stacks confuse Android features.

**Action:** Move to `admin-legacy/` folder, mark deprecated.

**Mobile win:** Clear which stack to use for new features.

### Story 3: Final Prisma peel (8 → 4 services)

**Why:** DB migrations less risky with fewer coupled services.

**Targets:**
- Narrative cache → repo
- WS session → repo or accept
- Legacy/admin → deprecate or accept

**Mobile win:** Safer schema changes.

---

## Sprint 65 — Test Velocity (REQUIRED)

**Effort:** 1 week  
**Priority:** P0 for fast iteration

### Story 1-2: Split giant specs

**Files:**
- `extraction.service.spec.ts` (3160 → 5 files)
- `match-engine.spec.ts` (3079 → 4 files)

**Why:** CI takes forever, mobile features break unrelated tests.

**Mobile win:** Add match feature → run 600 tests, not 3000.

### Story 3: Thin remaining specs (optional)

Only if CI still slow after 1-2.

---

## Sprint 66 — Optional Polish (NOT REQUIRED)

**Effort:** 1-2 weeks  
**Priority:** P3 — nice-to-have

Files like `dealbreaker-signals-text.extract.ts` (761 LOC), `tension-rules.ts` (721 LOC) are **frozen data dumps**, not active services.

**Recommendation:** Skip Sprint 66 for Android launch. Come back later if you want perfection.

---

## Execution Plan

### Phase 1: Now → Launch (4-5 weeks)

```
Week 1-2: Sprint 64 (match-ranking + legacy cleanup + final Prisma)
Week 3: Sprint 65 (test splits)
Week 4: Polish + bug fixes
Week 5: Android launch
```

### Phase 2: Post-Launch (optional)

```
Later: Sprint 66 (HG extract polish) if you want every file <500 LOC
```

---

## Mobile-Ready Checklist

After Sprints 64-65, your backend will be:

- ✅ Fast `/me/matches` endpoint (<5 layer trace)
- ✅ One clear match stack (no confusion)
- ✅ Minimal DB coupling (4 services, all justified)
- ✅ Fast CI (<5min for isolated changes)
- ✅ Clean ports (easy DTO mapping)
- ✅ Easy to debug (small, focused files)
- ✅ Safe to extend (repos protect schema)

---

## Paste Commands

All available in `ROUND3_AGENT_COMMANDS.md`:

**Sprint 64:**
```
--agent -1 sprint 64 story 1
--agent 0 sprint 64 story 1
... (see file for full sequence)
```

**Sprint 65:**
```
--agent -1 sprint 65 story 1
--agent 0 sprint 65 story 1
... (see file for full sequence)
```

---

## Final Metrics (After Sprint 65)

| Metric | Target | Status |
|--------|--------|--------|
| Largest service | ≤250 LOC | Match-ranking after S64 |
| Prisma coupling | ≤4 services | After S64 |
| Largest test | ≤2000 LOC | After S65 |
| DIP violations | 0 | Already done |
| Repository ports | All hot paths | Already done |

---

## My Honest Recommendation

**DO:** Sprints 64-65 (6-7 weeks total)  
**SKIP:** Sprint 66 until post-launch  
**LAUNCH:** Android app with confidence

Your backend will be cleaner than 99% of startups after Sprint 65. Good luck with the Android app! 🚀
