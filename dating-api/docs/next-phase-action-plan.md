# Next-phase action plan: dating engine

**Context:** Scoring is GOOD_ENOUGH_FOR_NOW. Formula tuning is frozen. Focus is signal/content enrichment.

**Reference docs:** `enrichment-hypothesis.md`, `signal-expansion-proposal.md`, `manual-pairs-validation.md`, `golden-pairs.md`.

---

## 1. Immediate next step (before any enrichment work)

**Baseline snapshot and regression guard**

- **Capture baseline (once):**
  - Run `npm run recompute-matches` from `dating-api` root and keep a copy of `data/matches/*.json` (or a dated snapshot) as *pre-enrichment baseline*.
  - Run `npm run validate:golden-pairs` and save the output (e.g. `docs/golden-baseline-YYYYMMDD.txt` or append to a log). Record: pass count, fail count, and finalScore for the 4 manual validation pairs (Tom–Natalie, Oded–Tom, Maya–Michal, Tamar–Hila).
  - For the same 4 pairs, record from the match JSONs: coverage %, friction, compatibility, finalScore. This is the *golden-set regression protection* reference.

- **Define regression rule:** After any extraction or pipeline change, the 4 manual pairs must remain within accepted bands (see manual-pairs-validation.md): Tom–Natalie and Oded–Tom SLIGHTLY_INFLATED with finalScore in range; Maya–Michal and Tamar–Hila PLAUSIBLE with finalScore in range. If any of the 4 moves outside the documented band → treat as regression; fix or revert before proceeding.

- **Do not:** Change scoring weights, add new tension rules that change finalScore, or change coverage/friction formula until enrichment is validated.

---

## 2. Week 1 plan

**Goal:** Run the extraction-quality experiment (Direction C from enrichment-hypothesis) and re-check golden set.

**Mon–Tue: Extraction experiment (no new signals)**

- **Scope:** Improve extraction from existing text only.
  - **Prompt:** Tighten extractor system prompt: add 1–2 “distinct from” lines for overlapping signals (e.g. directness vs “how you act in conflict”; emotionalDepth vs “being emotionally available”). No new signal keys.
  - **Rules:** Add or tune 2–3 text-inference rules for patterns that often miss today (e.g. “no drama” / “talk it through” → existing signals only; “routine” / “spontaneity” → existing signals only if possible, else document for future signal). Prefer conservative rules (only fire on clear phrases) to avoid hallucination.
  - **Artifact:** Short list of prompt edits and rule changes in a PR or doc (e.g. `docs/extraction-experiment-w1.md`) so changes are reviewable.

- **Re-run:** Re-analyze profiles (full re-extraction) for the cohort used in validation. Cohort = profiles that appear in (a) the 4 manual pairs, (b) the golden set (20 pairs), so all profiles that are in at least one of those pairs. Then run `npm run recompute-matches` so match outputs use the new extraction.

**Wed: Golden-set regression protection**

- Run `npm run validate:golden-pairs`. Compare to baseline.
- **Check 4 manual pairs first:** Tom–Natalie, Oded–Tom, Maya–Michal, Tamar–Hila must still be within the bands in manual-pairs-validation.md (e.g. finalScore 80–86 / 74–79 / 78–82 / 78–82 as applicable). If any regress → stop and fix before Week 2.
- **Then:** Note overall golden pass/fail count. We are not changing expected bands in `data/golden-pairs.json` this week; we are only ensuring the 4 manual pairs do not regress.

**Thu–Fri: Enrichment evaluation (first pass)**

- **Coverage:** For each profile in the cohort, compute % of current (15) signal slots that are non-null. Compare average coverage before vs after the extraction experiment. Record in `docs/extraction-experiment-w1.md` or a small table.
- **Evidence spot-check:** Open 3–5 re-analyzed profiles (mix of long and medium text). For any signal that changed or was newly filled, check that the evidence quote supports the score. If >1 obvious hallucination → note and consider reverting the rule that caused it.
- **Friction (exploratory):** Count how many of the 20 golden pairs have friction ≥ 1 before vs after. No target yet; for information only.

**Week 1 exit criteria:** (1) 4 manual pairs still in band, (2) coverage and evidence check done and documented, (3) no revert required due to regression or hallucination.

---

## 3. Week 2 plan

**Goal:** Decide next move using Week 1 results and lock the signal-expansion shortlist.

**Mon: Interpret Week 1**

- If Week 1 showed **no regression** and **coverage up on ≥2–3 cohort profiles** with no obvious hallucination → proceed to signal-expansion shortlist and pilot prep.
- If Week 1 showed **regression** or **hallucination** → document cause, revert or fix extraction changes, and repeat regression check before any new signals.

**Tue: Signal-expansion shortlist**

- **Shortlist (for first pilot only):** Choose **4** new signals from `signal-expansion-proposal.md` first wave. Recommended minimum viable set: **conflictStyle**, **noveltyVsRoutine**, **intellectualCuriosity**, **structureChaosTolerance**. (Emotional availability and family orientation have higher overlap risk; add in a second wave after pilot.)
- **Document:** In `docs/next-phase-action-plan.md` or a short doc, record: the 4 chosen signals, their 1–2 sentence definitions and “distinct from” lines for the extractor prompt, and whether any will use protected cues (e.g. only score when explicit phrase present). No code yet — spec only.

**Wed–Thu: Pilot implementation prep (spec only)**

- **Extraction:** Spec for adding the 4 keys to `EXTRACTION_SIGNAL_KEYS`, prompt text for each, and 2–3 example phrases per signal. Plan: run extraction in shadow mode (write new signals to analysis output but do not yet feed them into compatibility or tension).
- **Tension (later):** List 1–2 candidate tension rules that would use the new signals (e.g. large conflictStyle gap; noveltyVsRoutine mismatch). Do not implement yet; just write rule conditions and expected penalty so they can be added after shadow extraction is validated.

**Fri: Validation plan confirmation**

- Confirm the validation plan (Section 4) with the actual cohort and commands. Ensure `npm run validate:golden-pairs` and the 4-pair check are part of the standard runbook after any change.

---

## 4. Validation plan

**When:** After every extraction change or signal addition (Week 1 experiment, and any Week 2+ pilot).

**Golden-set regression protection**

- **Mandatory:** Run `npm run recompute-matches` then `npm run validate:golden-pairs`.
- **4 manual pairs:** Tom (#37) ↔ Natalie (#merged_14), Oded (#26) ↔ Tom (#37), Maya (#merged_1) ↔ Michal (#merged_12), Tamar (#merged_5) ↔ Hila (#25). After each run, verify finalScore is within the bands in `manual-pairs-validation.md`. If any pair moves out of band → treat as regression; do not ship without fix or revert.
- **Full golden set:** Record pass/fail count. Expected bands in `data/golden-pairs.json` are not changed during enrichment phase unless we explicitly decide to re-baseline (separate decision).

**Enrichment metrics (did enrichment help?)**

- **Coverage:** Average % of signal slots non-null per profile, over the cohort (4-pair + golden-set profiles). Compare before vs after each experiment. Success = coverage increases without obvious hallucination.
- **Evidence quality:** For any new or changed signal, spot-check 3–5 profiles: evidence quote must support the score. If multiple clear hallucinations → fail and fix.
- **Friction (once new signals are wired):** After adding tension rules that use new signals, count pairs with friction ≥ 1 in golden set and in top-20 by score. Goal: more differentiation (e.g. “cynical vs straight” or “activist vs flirt” get friction > 0) without regressing the 4 manual pairs.
- **Human judgment:** 4 manual pairs remain PLAUSIBLE or SLIGHTLY_INFLATED as documented; no pair that was PLAUSIBLE becomes INFLATED or BROKEN.

**Commands and artifacts**

- `npm run recompute-matches` (from dating-api root).
- `npm run validate:golden-pairs`; save or log output.
- Optional: script or one-off to compute average coverage over a list of profile IDs; result stored in experiment doc.

---

## 5. Stop conditions / success criteria

**Stop and fix (do not proceed to next phase):**

- Any of the 4 manual pairs moves out of its accepted finalScore band after a change.
- Evidence spot-check finds more than one clear hallucination attributable to a new rule or prompt change.
- Golden pass count drops by more than 2 compared to baseline (and the drop is caused by the enrichment change, not by data/schema changes).

**Success (proceed to next step):**

- **After Week 1:** 4 manual pairs in band; coverage up on ≥2–3 cohort profiles; no revert needed. → Proceed to signal-expansion shortlist and pilot spec (Week 2).
- **After pilot (shadow extraction with 4 new signals):** New signals have reasonable non-null rate on cohort (e.g. ≥1 of the 4 filled on ≥30% of profiles where text allows); evidence spot-check clean. → Proceed to wire 1–2 tension rules and re-run validation.
- **After tension wiring:** 4 manual pairs still in band; at least one previously “friction=0” pair that human audit said should have tension now has friction ≥ 1, without regressing the 4 pairs. → Enrichment helped; consider second wave of signals or structured prompts (Direction B).

**What not to do yet**

- **Do not** change scoring formula, compatibility weights, or coverage/friction math during this phase. Scoring is frozen.
- **Do not** add more than 4 new signals in the first pilot. Validate four before expanding.
- **Do not** change expected bands in `data/golden-pairs.json` to make passes; only re-baseline if there is an explicit decision and doc.
- **Do not** ship new tension rules that use new signals until shadow extraction has been validated (evidence quality, no regression).
- **Do not** start Direction B (structured profile prompts / new UX) until Direction C (extraction quality) and the 4-signal pilot have been validated.
