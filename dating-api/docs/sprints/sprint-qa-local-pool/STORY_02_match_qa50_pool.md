# Story 02 — Run / verify match lists for QA pool

**Sprint QA local pool · Status: Done**  
**Priority:** P0  
**Estimated effort:** 0.5 day  
**Dependencies:** Story 1  
**Repo:** `dating-api`  
**Handoffs:** `handoffs/STORY_02_match_qa50_pool/agent-*.md`  
**Architect:** [handoffs/STORY_02_match_qa50_pool/agent-0-architect.md](./handoffs/STORY_02_match_qa50_pool/agent-0-architect.md)  
**Dev:** [handoffs/STORY_02_match_qa50_pool/agent-1-dev.md](./handoffs/STORY_02_match_qa50_pool/agent-1-dev.md)  
**CR:** [handoffs/STORY_02_match_qa50_pool/agent-2-cr.md](./handoffs/STORY_02_match_qa50_pool/agent-2-cr.md)  
**PM:** [handoffs/STORY_02_match_qa50_pool/agent-3-pm.md](./handoffs/STORY_02_match_qa50_pool/agent-3-pm.md)

---

## Objective

Turn the seeded pool into **usable `/dating/me-matches` lists** for designated QA viewers: scores, priority tiers (HIGH/GOOD/OTHER), Why chips where possible.

---

## Approach (Agent 0 picks one primary)

| Option | Pros | Cons |
|--------|------|------|
| **A. Real backfill** `npm run match-list:backfill-ranks` | True engine scores; good for “understanding” | Needs Redis/worker; slower; scores less controlled |
| **B. Upsert `MatchListRank`** (s41 style) | Fast, deterministic tiers for demos | Not “real” algorithm truth |
| **C. Hybrid** | Backfill for truth + verify script prints tier mix | More moving parts |

**Recommendation:** **C** — run backfill when stack allows; ship `verify:qa50` that prints per-viewer counts + tier histogram; document B as offline fallback.

---

## Scope / Tasks

### Agent 0
1. ✅ Lock primary path → **Hybrid C**: `--demo` default (AC), `--engine` optional, Bull backfill docs-only
2. ✅ Viewers = `v01`–`v04`; candidates = opposite-gender `qa50_*` only
3. ✅ Success: demo ≥15 ranks/viewer + ≥2 tiers; never wipe `s41val_*` ranks
4. ✅ Demo score cycle locked (92/88/80/76/72/62/55/48)

### Agent 1
1. ✅ `build-qa50-match-ranks.ts` — `--demo` default + `--engine`
2. ✅ `verify:qa50-matches` (+ `--assert-demo`) — PASS locally
3. ✅ `QA50_POOL.md` updated (seed → ranks → verify → UI; Bull warning)
4. ⏳ Live API/UI smoke deferred (API down) → Agent 3

### Agent 2
1. ✅ Ranks reference only `qa50_*` candidates for QA viewers
2. ✅ s41val ranks untouched; scoped delete/upsert
3. ✅ Demo AC ≥15 + ≥2 tiers; no product UI changes
4. ✅ CR: verify self/prefix guards

### Agent 3
1. ✅ Live smoke: v01 cookie → API list ready, 25 matches, tiers 7/9/9
2. ✅ Noted demo distribution (~28/36/36) for threshold intuition
3. ✅ ACCEPT

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Approach | **Hybrid C** — demo ranks default; engine optional; global Bull docs-only |
| Viewers | `qa50` v01–v04 only |
| Candidates | Opposite-gender `qa50_*` (not self, not s41val/real) |
| Demo scores | Cycle `92,88,80,76,72,62,55,48` by sorted profileId |
| AC | Each viewer ≥15 ranks + ≥2 tiers (demo); live list smoke |
| Scope of writes | Only ranks for qa50 viewer userIds |
| s41val | Do not delete/overwrite those viewers’ ranks in qa50 scripts |
| UI / thresholds / engine formulas | Frozen |

---

## Acceptance Criteria

- [x] Documented match-build path works on local stack (`qa50:ranks`)  
- [x] Verify script prints match counts + tiers for QA viewers  
- [x] At least one viewer shows a multi-card Smart Triage list in UI — live API 25 + tiers  
- [x] `s41val_` fixtures remain usable (rank count unchanged by qa50:ranks)  

---

## Suggested Commit

```
test(qa): verify qa50 match lists and tier distribution

Sprint QA local pool Story 2
```
