# Sprint 15: Match preferences simplification

**Epic:** Cut match preferences down to the 3 dimensions the product actually wants users to set manually; retire the rest as dead/duplicated surface  
**Duration:** ~3-5 days (1 story)  
**Goal:** `/settings/preferences` (and the underlying `UserProfilePreference` hard-eligibility path) only exposes **who I'm open to**, **partner age range**, and **max distance**. Lifestyle (smoking/alcohol), education, family (wants/has children), religion, and similarity are removed — not replaced yet, just removed.  
**Status:** Done (engineering gate — operator smoke pending)  
**Depends on:** — (no dependency on Sprint 14)

---

## Why this sprint

Investigation into "are match preferences obsolete" (triggered by a product decision that lifestyle/education/family should eventually be *discovered by the engine* from free text, not hand-picked in a settings form) turned up two separate problems:

1. **Product decision:** the team wants only 3 manually-set preference dimensions — `acceptedPartnerGenders` ("open to"), `partnerAgeMin`/`partnerAgeMax`, `maxDistanceKm`. Everything else (smoking, alcohol, religion, education, wants/has-children, similarity) should stop being a manual form field; if/when it comes back, it comes back as something the personality/compatibility engine infers, not a checkbox list.
2. **A live correctness bug that independently justifies removing 5 of those 6 now:** the Holy Grail hard-eligibility evaluator FAILs a candidate when the *candidate's own* fact for a dimension (`education`, `smokingFrequency`, `alcoholUse`, `religion`, `wantsChildren`/`childrenStatus`) is missing — and **no UI anywhere lets a user set their own education/religion/smoking/alcohol/children status**. `dating-ui/src/lib/me-profile-api.ts` never exposes those self-fact fields. That means today, any user who fills in the smoking/alcohol/religion/education/children sections of Match Preferences hard-filters out **every** candidate on that dimension and can silently drop to zero matches. See `dating-api/src/holy-grail-matching/eligibility.evaluator.ts` (`evalEducation`, `evalSmoking`, `evalAlcohol`, `evalReligion`, `evalPartnerWantsChildren`, `evalPartnerHasChildren` — all `FAIL` on missing candidate fact, not `SKIPPED`).

`similarityPreference` is the one exception to "dead code" — it's a real, working ranking overlay in `holy-grail-five-signal-ranking.ts` (nudges score by profile-overlap, not a hard filter). It's being removed anyway per the product decision above, not because it's broken.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Kept preference dimensions | `acceptedPartnerGenders` ("open to"), `partnerAgeMin`/`partnerAgeMax`, `maxDistanceKm` — nothing else |
| Removed dimensions | Education, smoking, alcohol, religion, wants/has-children, similarity — removed from UI, API, hard eligibility, and ranking overlay |
| Self-facts (`UserProfile.education`/`religion`/`smokingFrequency`/`wantsChildren`/`childrenStatus`) | **Not touched this sprint.** Stay on the schema/DTOs as inert fields — they're the planned future input surface for engine-based discovery (separate future sprint). Do not delete these columns. |
| "Engine discovers it" replacement | **Not this sprint.** This story only removes the manual form/filter; it does not build any LLM/personality-signal replacement for lifestyle/education/family compatibility. |
| DB schema | `UserProfilePreference` columns for the removed dimensions get a real Prisma migration (drop columns) — no zombie columns left behind, matching prior cleanup precedent (Phase F). |

---

## Story checklist

| # | Story | Priority | Status | Depends on |
|---|--------|----------|--------|------------|
| 1 | [Reduce match preferences to open-to + age range + max distance](./STORY_01_reduce_match_preferences_to_core_three.md) | **P0** | **Done** | — |

---

## Sprint-level definition of done

- [x] `/settings/preferences` only renders "open to", age range, and max distance sections
- [x] Holy Grail hard eligibility only evaluates `GENDER`, `AGE`, `PROXIMITY` — education/smoking/alcohol/religion/children dimensions removed (not just disabled)
- [x] `similarityPreference` ranking overlay removed from `holy-grail-five-signal-ranking.ts`
- [x] `UserProfilePreference` Prisma model + migration drop the 7 removed columns; `acceptedPartnerGenders`/`partnerAgeMin`/`partnerAgeMax`/`maxDistanceKm` remain
- [x] `UserProfile` self-fact columns (`education`, `religion`, `smokingFrequency`, `wantsChildren`, `childrenStatus`) are **unchanged**
- [x] Full API + UI test suites green (**1418** API · **371** UI)
- [ ] Operator manual smoke — pending

---

## Shipped gate (2026-07-11)

| Gate | Result |
|------|--------|
| Pipeline | agent 0 → 1 → 2 → 3 complete |
| Migration | `20260711120000_drop_user_profile_preference_lifestyle_fields` |
| Tests | dating-api **1418/1418** · dating-ui **371/371** |

Handoffs: `handoffs/STORY_01_reduce_match_preferences_to_core_three/agent-*.md`
