# Story 04 — Real-user list: photos + ranks (park fake login)

**Sprint QA local pool · Status: Done**  
**Priority:** P0 (operator wants volume on **real** login)  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Stories 1–2 (pool + ranks scripts exist)  
**Repo:** `dating-api` scripts/docs (no product UI)  
**Handoffs:** `handoffs/STORY_04_real_viewer_qa50_list/agent-*.md`  
**Architect:** [handoffs/STORY_04_real_viewer_qa50_list/agent-0-architect.md](./handoffs/STORY_04_real_viewer_qa50_list/agent-0-architect.md)  
**Dev:** [handoffs/STORY_04_real_viewer_qa50_list/agent-1-dev.md](./handoffs/STORY_04_real_viewer_qa50_list/agent-1-dev.md)  
**CR:** [handoffs/STORY_04_real_viewer_qa50_list/agent-2-cr.md](./handoffs/STORY_04_real_viewer_qa50_list/agent-2-cr.md)  
**PM:** [handoffs/STORY_04_real_viewer_qa50_list/agent-3-pm.md](./handoffs/STORY_04_real_viewer_qa50_list/agent-3-pm.md)  
**Parked:** Story 3 fake-cookie logins — keep docs; do **not** expand fake-login UX this story.

---

## Objective

When you log in as your **real** local account, see a usable Smart Triage list fed by the `qa50_*` pool:

1. **≥1 APPROVED photo per qa50 profile** (not 50 photos each — **1+ each**).
2. **MatchListRank for your real user** → eligible `qa50_*` candidates.
3. **AC:** at least **5** matches on `/dating/me-matches` as you (prefer full partner-gender pool).

Fake `qa50-viewer-v0N` cookies stay available but are **out of scope** for this story.

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Viewer select | **Required** `--email=` or `QA50_REAL_VIEWER_EMAIL` (never auto-pick) |
| Refuse | `qa50_*` / `s41val_*` viewers; missing/not ANALYZED |
| Photos | **Approach A** — better synthetic gradient PNGs; **≥1 each**; not stock pack; not 50/profile |
| Rank command | **New** `npm run qa50:ranks-real` (do **not** overload `qa50:ranks`) |
| Rank mode | Demo default (Story 2 score cycle); `--engine` optional |
| Candidates | `qa50_*` with gender ∈ viewer partner genders (preference → desired → opposite fallback) |
| Rank safety | Delete/replace **only** ranks where candidate id is `qa50_*`; preserve other ranks |
| Analysis | **OUT** — follow-up later; seed already ANALYZED |
| Fake login | **Parked** |
| UI / thresholds | Frozen |

---

## Scope / Tasks

### Agent 0
1. ✅ Lock real-viewer selection (email / CLI).
2. ✅ Lock photo approach A + “1+ APPROVED each”.
3. ✅ Lock new `qa50:ranks-real` (not extend `qa50:ranks`).
4. ✅ Lock analysis **OUT**.
5. ✅ AC + scoped rank safety + fake login parked.

### Agent 1
1. ✅ Upgrade seed photos (Approach A); ensure ≥1 APPROVED each.
2. ✅ Implement `qa50:ranks-real` + verify (`--email=…`).
3. ✅ Update `QA50_POOL.md` — real-me path first.
4. ✅ No LLM analysis; no product UI.

### Agent 2
1. ✅ Safety: opted-in viewer only; qa50 candidates only; non-qa50 ranks preserved.
2. ✅ Local-only guards; no prod/S3 instructions.
3. ✅ No product UI changes.

### Agent 3
1. ✅ Real login ≥5 cards (DB: 50 qa50 ranks for operator email; UI hard-refresh).
2. ✅ ACCEPT; analysis deferred.

---

## Non-goals

- 50 photos per profile  
- Expanding fake-cookie login UX  
- Production / staging seed  
- Changing priority thresholds or browse UI  
- LLM re-analysis of qa50 (this story)  
- Global `match-list:backfill-ranks` as the only path  

---

## Acceptance Criteria

- [x] Every `qa50_*` profile has **≥1** APPROVED local photo (improved synthetic)  
- [x] `qa50:ranks-real -- --email=…` builds ranks for that viewer → qa50 candidates  
- [x] Real login shows **≥5** matches on `/dating/me-matches` (50 ranks ready; hard-refresh as you)  
- [x] Existing non-qa50 ranks for that viewer unchanged  
- [x] Fake-login docs remain; not required for this AC  
- [x] Cleanup still deletes only `qa50_*` (real user untouched)

---

## Suggested Commit

```
test(qa): attach qa50 ranks to real local viewer with photos

Sprint QA local pool Story 4
```
