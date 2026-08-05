# Story 02 — Run / verify match lists for QA pool

**Sprint QA local pool · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 0.5 day  
**Dependencies:** Story 1  
**Repo:** `dating-api`  
**Handoffs:** `handoffs/STORY_02_match_qa50_pool/agent-*.md`

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
1. Lock primary path (A/B/C) and which profiles are “viewers” vs “candidates”.
2. Define success: e.g. each QA viewer sees ≥15 matches spanning ≥2 tiers (or document if engine yields different mix).
3. Warn: do not wipe `s41val_` ranks; backfill is per viewer — OK if scoped.

### Agent 1
1. Wire verify script: for each QA viewer, count ranks, tier histogram, photo gate.
2. Document commands: seed → (optional redis) backfill → verify → open UI.
3. If hybrid fallback: optional `--ranks-demo` to upsert demo scores for one viewer.

### Agent 2
1. Verify ranks reference only `qa50_*` candidates for QA viewers.
2. Confirm materialized list shows overlayed rank scores (Sprint 41 CR behavior).

### Agent 3
1. Live smoke: cookie login → `/dating/me-matches` → see volume + sections.
2. Note actual HIGH/GOOD/OTHER distribution for learning (feeds threshold intuition).

---

## Acceptance Criteria

- [ ] Documented match-build path works on local stack  
- [ ] Verify script prints match counts + tiers for QA viewers  
- [ ] At least one viewer shows a multi-card Smart Triage list in UI  
- [ ] `s41val_` fixtures remain usable  

---

## Suggested Commit

```
test(qa): verify qa50 match lists and tier distribution

Sprint QA local pool Story 2
```
