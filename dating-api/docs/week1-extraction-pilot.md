# Week 1 extraction pilot report

**Goal:** Improve profile understanding through extraction quality only; no scoring/formula changes.

**Scope:** Pilot only. No new signals wired into scoring. No compatibility or weight changes.

---

## 1. Exact prompt changes made

- **Anti-double-count:** Added explicit instruction: "A single phrase or theme (e.g. direct, calm, spiritual) should support at most 1–2 signals unless the text explicitly gives separate evidence for each. Generic phrases … support at most 1–2 low-confidence signals."

- **Evidence rules:** Evidence must be a "short direct quote from the text (5–15 words)"; "verbatim or near-verbatim snippet"; "If you cannot point to a specific snippet that supports a score, use null for that signal." Output instruction updated to: `"quote": "<5-15 word snippet from the text>"`.

- **Clearer signal definitions and "distinct from":**
  - **emotionalDepth:** "how much someone VALUES emotional depth and vulnerability … Distinct from: attachmentSecurity (style of bonding), and from whether they are currently 'available' — this is about value, not behavior."
  - **attachmentSecurity:** "secure vs anxious/avoidant … Distinct from: emotionalDepth (which is value placed on depth); attachment is about style of connecting."
  - **relationshipClarity:** "clarity about relationship goals … Distinct from: traditionalism (values/convention); this is about what kind of relationship they want."
  - **directness:** "how directly someone communicates day-to-day … Distinct from: how they behave in conflict (that is not a signal yet — do not infer conflict style from directness)."
  - **independence:** "need for autonomy and space … Distinct from: socialBattery (social vs alone); independence is about needing space and autonomy."
  - **socialBattery:** "preference for social vs solitary time … Distinct from: lifestylePace (speed of life)."
  - **lifestylePace:** "slow (low) ↔ fast-paced life (high) … Distinct from: socialBattery; pace is speed/activity level."

- **Grouping in prompt:** Signals grouped as "CORE RELATIONSHIP / EMOTIONAL", "COMMUNICATION / STYLE", "LIFESTYLE / PACE", "BODY / HEALTH / MONEY / VALUES" to reduce conflation.

---

## 2. Exact inference rules added

All three rules fill **existing signals only** when the LLM left them null. Conservative patterns; they never override LLM output.

| Rule id | Patterns (regex) | Inferences | Note |
|---------|------------------|------------|------|
| **conflict_talk_through** | `\btalk\s+things?\s+through\b`, `\bwork\s+through\s+(?:it\|conflict\|disagreement)\b`, `\bdiscuss\s+when\s+we\s+disagree\b`, `\bhash\s+it\s+out\b` | directness = 6 | "talk things through / hash it out" → directness 6 |
| **routine_predictable** | `\blove\s+(?:my\s+)?routine\b`, `\bneed\s+predictability\b`, `\bsame\s+every\s+day\b`, `\bstructured\s+week\b` | lifestylePace = 4 | "routine / predictability" → lifestylePace 4 |
| **spontaneous_flow** | `\bspontaneous\b`, `\bgo\s+with\s+the\s+flow\b`, `\blast[- ]?minute\s+plans?\b` | lifestylePace = 6 | "spontaneous / go with the flow" → lifestylePace 6 |

---

## 3. Cohort used

- **Source:** `data/pilot-cohort.json`
- **Profile IDs (18):** 37, merged_14, 26, merged_1, merged_12, 25, merged_5, 18, 21, 16, 17, 2, 14, 8, 6, 7, 9, 3
- **Composition:** 7 profiles from the 4 manual validation pairs (Tom, Natalie, Oded, Maya, Michal, Tamar, Hila) + 11 from the golden set (Straight shooter, הישיר/ה, Cynical romantic, Zen Yoga Teacher, Spiritual Free-Spirit, Quiet team, Romantic boundaries, Flirt analytic, Radical Activist, Intellectual Academic, Traditional Nerd).

---

## 4. Coverage before vs after

- **Coverage before (avg % of self signal slots non-null):** **60.4%** (computed from existing profile JSONs at pilot start).
- **Coverage after:** See output of `npm run reanalyze-cohort` after the run completes. Example: "Coverage after (avg %): X.X" in the script’s final report.

*(If reanalyze-cohort has been run to completion, copy the "Coverage after" value from its console output here.)*

---

## 5. Evidence quality notes (3–5 profiles)

- **Intent:** Spot-check that new or changed evidence quotes support the assigned score; no obvious hallucination.
- **How to check:** After reanalyze completes, open 3–5 profile JSONs from `data/profiles` (e.g. 37, merged_14, 14, 17, 9), read `evaluation.self.evidence` (and partner/relationship if needed), and confirm each quote appears in or is clearly supported by the profile text.
- **Pilot run:** Sample extractions seen in logs (e.g. self nonNullCount 6–9, relationship 7 after retry) are consistent with quote-based evidence. No spot-check of saved JSONs was done in this report; recommend doing it before marking PROCEED.

---

## 6. Whether the 4 manual pairs stayed in band

- **4 manual pairs (see manual-pairs-validation.md):** Tom (#37) ↔ Natalie (#merged_14), Oded (#26) ↔ Tom (#37), Maya (#merged_1) ↔ Michal (#merged_12), Tamar (#merged_5) ↔ Hila (#25).
- **Expected bands:** Tom–Natalie 80–86, Oded–Tom 74–79, Maya–Michal 78–82, Tamar–Hila 78–82.
- **How to verify:** After `npm run reanalyze-cohort` has finished, run `npm run recompute-matches` then `npm run validate:golden-pairs`. Open `docs/golden-pairs.md` and confirm rows 1–4 show **PASS** and finalScore within the bands above.

*(Fill after running validate:golden-pairs: e.g. "All 4 PASS, in band" or "Pair X FAIL, finalScore Y outside band.")*

---

## 7. Recommendation

- **PROCEED_TO_WEEK2** — Use this if: (1) reanalyze-cohort completed with no errors, (2) coverage after ≥ coverage before (or small drop with no sign of hallucination), (3) spot-check of 3–5 profiles shows evidence matches text, and (4) all 4 manual pairs PASS and are in band after recompute + validate.
- **ADJUST_AND_REPEAT** — Use this if: any of the 4 manual pairs regresses (FAIL or out of band), or evidence spot-check finds clear hallucination, or coverage drops sharply with no good explanation.
- **REVERT** — Use this if: multiple pairs regress or systematic evidence hallucination; revert extraction prompt and inference rules, then re-run cohort and validate.

**Suggested next steps:** Once reanalyze-cohort has finished, run `npm run recompute-matches` and `npm run validate:golden-pairs`, then update this section with the actual 4-pair status and set the recommendation accordingly.

---

## 8. Commands reference

```bash
# Re-analyze cohort (uses current extraction; writes to data/profiles)
npm run reanalyze-cohort

# Recompute all matches from updated profiles
npm run recompute-matches

# Validate golden set and write docs/golden-pairs.md
npm run validate:golden-pairs
```

Ensure `PROFILES_DATA_DIR` is not set (or points to `data/profiles`) when running reanalyze-cohort so the script uses the project’s profile data.
