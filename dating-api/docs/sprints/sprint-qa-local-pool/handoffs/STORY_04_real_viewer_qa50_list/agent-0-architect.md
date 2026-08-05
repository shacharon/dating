# Handoff: Agent 0 — Architect — Sprint QA pool Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_real_viewer_qa50_list.md](../../STORY_04_real_viewer_qa50_list.md)  
**Sprint:** sprint-qa-local-pool  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Attach `qa50_*` pool to **one real local login**. **Skip Agent 4.** Fake-cookie UX stays **parked**.  
**Repos:** `dating-api` scripts + `QA50_POOL.md`. No product UI / thresholds / engine formulas.

---

## Summary

Operator wants volume on **their** account (today: ~1 match), not fake `qa50` cookies. Story 4:

1. Keep **≥1 APPROVED photo per qa50 profile**; upgrade solid placeholders to better **synthetic** images (still 1 each — not 50/profile).  
2. New scoped script writes **demo** `MatchListRank` rows for **one explicit real viewer** → eligible `qa50_*` candidates.  
3. **Do not** run LLM re-analysis this story (seed already `ANALYZED`).  
4. AC: real login shows **≥5** cards on `/dating/me-matches` (target full opposite/partner-gender pool ~15–25+).

---

## Baseline

| Fact | Detail |
|------|--------|
| Pool | 50 `qa50_*`, 25 M / 25 F, already ANALYZED + 1 APPROVED solid PNG each |
| Fake viewers | Story 2–3: `qa50:ranks` + cookies — **parked** for day-to-day |
| Real local users (sample) | e.g. `shacharon@gmail.com` MALE ANALYZED, seeking M+F, **1** existing rank; also other Gmail / sprint seeds |
| List gate | Viewer must be ANALYZED + ≥1 APPROVED photo; candidates with 0 approved photos are filtered out |
| Risk | Naïve `deleteMany({ viewerUserId })` would wipe the operator’s existing non-qa50 match |

---

## Decision: real viewer selection (locked)

| Rule | Detail |
|------|--------|
| **Required** | `--email=<addr>` **or** env `QA50_REAL_VIEWER_EMAIL` (CLI flag wins if both set) |
| **Refuse** | Missing email; user not found; `userId` starts with `qa50_` or `s41val_`; no profile; profile not `ANALYZED` |
| **Never** | Default to “first non-qa50 user” or batch all real users |
| **Docs example** | `shacharon@gmail.com` (local operator account) — not hardcoded in script |

```bash
npm run qa50:ranks-real -- --email=you@example.com
# or
set QA50_REAL_VIEWER_EMAIL=you@example.com
npm run qa50:ranks-real
```

Optional: `--userId=` as alternate resolver (same refuse rules). Email remains primary in docs.

---

## Decision: photos (locked) = Approach A

| Item | Lock |
|------|------|
| Count | **≥1 APPROVED** local photo per `qa50_*` profile (**not** 50 each) |
| Quality | **A — better synthetic**: replace tiny solid swatches with larger (~256–512) **gradient / abstract portrait-ish PNGs** (gender-tinted or hue from existing `photoRgb`). Still generated in seed — no stock face pack, no S3 |
| Reject | B (bundled stock JPEGs) for this story — extra assets / licensing noise  
| Reject | C (leave solids) as the only change — operator asked for better fake pictures |
| Path | Update `seed-qa50-pool` photo writer; re-run `npm run seed:qa50`; `verify:qa50` still photo-gates |

---

## Decision: rank script (locked) = new `qa50:ranks-real`

**Do not** teach `qa50:ranks` to write real viewers (keeps Story 2 invariant: that command only touches `qa50_*` viewer userIds).

| Item | Lock |
|------|------|
| Command | `npm run qa50:ranks-real` → new script e.g. `scripts/build-qa50-ranks-for-real-viewer.ts` |
| Default mode | **Demo** scores — same cycle as Story 2: `92,88,80,76,72,62,55,48` by sorted `candidateProfileId` |
| Optional | `--engine` (same sync compare helpers as Story 2); demo remains AC |
| Candidates | `qa50_*` profiles whose `gender` ∈ viewer’s partner genders; not the viewer’s own profile (N/A). Partner genders from preference `acceptedPartnerGenders` if present, else `UserProfile.desiredPartnerGenders`. If empty, fall back to opposite of viewer `gender`. |
| Expected size | Seeking one gender → ~25; seeking both → up to ~50. AC floor **≥5**; prefer writing the full eligible set |
| Fake viewers | Unchanged; `qa50:ranks` still used for v01–v04 |

### Safety — rank writes (critical)

| Do | Don’t |
|----|-------|
| `deleteMany` where `viewerUserId = real` **AND** `candidateProfileId` starts with `qa50_` | `deleteMany({ viewerUserId })` alone (wipes real/s41val ranks) |
| `createMany` only `qa50_*` candidate IDs | Insert non-qa50 candidates |
| Assert `assertQa50SafeEnvironment()` | Run against non-local DB / S3 |
| Print before/after count of **non-qa50** ranks for that viewer (must be unchanged) | Touch other users’ ranks |

Reuse demo score helper / histogram printing from Story 2 where practical (extract small shared util **only if** cheap; duplication OK for speed).

---

## Decision: analysis (locked) = **OUT** this story

| Why | Seed profiles are already `ANALYZED` with evaluations/signals; list cards + tiers work from demo ranks. |
| Follow-up | Optional later story: real LLM analysis on qa50 subset for richer Why chips / engine scores. |

Agent 1 must **not** enqueue global analysis or `phase-f:expand-analyzed` as part of AC.

---

## Decision: fake login (locked) = parked

Keep `QA50_POOL.md` cookie section. Story 4 docs lead with **“real me”** path (email ranks → own Google/session login). Do not expand cookie UX.

---

## Acceptance mapping

| AC | How |
|----|-----|
| ≥1 APPROVED photo each qa50 | Seed upgrade + `verify:qa50` |
| Documented command for one real viewer | `qa50:ranks-real -- --email=…` + `QA50_POOL.md` |
| Real login ≥5 matches | Demo ranks + Agent 3 UI/API smoke as that user |
| Fake login not required | Parked |
| Cleanup qa50-only | Unchanged Story 1 cleanup; real user untouched |

Verify script (Agent 1): e.g. `npm run verify:qa50-real -- --email=…` asserts ≥5 qa50 ranks, ≥2 tiers (demo), non-qa50 rank count unchanged.

---

## Agent 1 brief

1. Read this handoff + Story 04.  
2. Upgrade qa50 seed photos (Approach A); re-seed.  
3. Implement `qa50:ranks-real` + verify with **scoped** delete.  
4. Update `QA50_POOL.md` (real-me first).  
5. No LLM analysis; no UI; no token renames.

**Next command:**

```text
--agent 1 sprint qa-pool story 4
```
