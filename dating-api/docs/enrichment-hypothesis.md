# Enrichment hypothesis: dating profile pipeline

**Goal:** Test whether richer extraction/content improves match quality more than further formula tuning.

**Scope:** Hypothesis and experiment design only. No code or scoring changes.

---

## 1. What is currently missing in profile understanding

- **Behavioral/relational dimensions:** We have *values* (emotionalDepth, relationshipClarity, traditionalism) and *lifestyle* (socialBattery, lifestylePace, independence) but little about *how* people behave in conflict, express affection, or handle stress. Audits show **FRICTION_TOO_SOFT** — friction = 0 on pairs where “cynical vs straight,” “activist vs flirt,” or “quiet vs free-spirit” could clash. We lack explicit signals for conflict style, emotional availability, caregiving/warmth, and control vs flexibility.

- **Content dimensions that drive daily fit:** Novelty vs routine, structure vs chaos tolerance, and family/kids orientation are either missing or folded into broader signals (lifestylePace, traditionalism, relationshipClarity). That makes it harder to surface mismatches that users care about (e.g. “want kids,” “need order,” “love spontaneity”).

- **Differentiation when text is sparse or generic:** **SPARSE_INFLATION** and **GENERIC_VS_SPECIFIC** mean minimal or vague profiles still get high compatibility because (a) only the intersection of filled signals is used, (b) missing signals don’t penalize. We don’t distinguish “no signal because no text” from “low value,” and we don’t incentivize or guide users to provide signal-rich content.

- **Intellectual and humor fit:** “Deep conversations,” “sense of humor,” and “someone I can talk to for hours” are common asks but not explicitly extracted. They sit in generic “emotional depth” or go unmeasured, so we can’t match or tension on them.

---

## 2. Which new content/signals could improve matching most

Prioritized by impact on the gaps above (see also `docs/signal-expansion-proposal.md`):

| Priority | New signal / content | Why it helps |
|----------|----------------------|--------------|
| **Highest** | conflictStyle, emotionalAvailability, noveltyVsRoutine, caregivingWarmth | Directly address FRICTION_TOO_SOFT and daily-fit mismatches; stable, inferrable from text. |
| **High** | intellectualCuriosity, structureChaosTolerance, familyOrientationNuance, controlVsFlexibility | Dealbreaker or high-friction areas (kids, order, who decides); “deep conversations” is highly stated. |
| **Medium** | Optional structured prompts (e.g. “How do you handle disagreement?” “What do you need in a partner?”) | More signal-rich input → better coverage and less SPARSE_INFLATION / GENERIC_VS_SPECIFIC. |
| **Supporting** | humorPlayfulness, expressivenessAffection; refinement of existing extraction (prompt/evidence) | Improves differentiation and alignment on style without adding many new keys. |

---

## 3. Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Noise** | New or broader signals increase variance; LLM may fill from weak cues. | Protected cues for sensitive signals (e.g. familyOrientationNuance only when kids/family explicitly mentioned); keep strict evidence requirements. |
| **Overfitting** | Tuning extraction or scoring to a small golden set may not generalize. | Validate on held-out pairs and on top-N by score (audit-style); track coverage and friction distribution, not only score. |
| **Overlap** | emotionalAvailability vs emotionalDepth/attachmentSecurity; familyOrientationNuance vs relationshipClarity/traditionalism. | Clear prompt definitions (“X is …; distinct from Y which is …”); avoid double-counting in compatibility/tension by reviewing rule design before rollout. |
| **Token cost** | More signals → longer prompt and output; optional fields → more text per profile. | Add signals in waves; optional prompts can be short (1–2 sentences); monitor cost per profile and cap non-null signals if needed. |

---

## 4. Minimum experiment to run first

**Name:** Extraction-quality baseline (no new signals).

**What:** Improve extraction from *existing* profile text only:
- Tighten system prompt (clearer signal definitions, “distinct from” for overlapping concepts).
- Add or tune 2–3 high-value text-inference rules for signals that are often missing (e.g. conflict, novelty/routine) using existing vocabulary where possible.
- Optionally: slightly increase priority given to evidence strength when selecting which signals to keep near the 12-signal cap.

**Cohort:** Fixed set of profiles that already have human judgment or audit labels:
- 4 manual validation pairs (Tom–Natalie, Oded–Tom, Maya–Michal, Tamar–Hila).
- Top-15 audit pairs (or a subset of 8–10 that mix FAIR, INFLATED, BROKEN).

**Metrics:**
- **Coverage:** % of signal slots non-null per profile (expect modest lift on medium-length profiles).
- **Evidence quality:** Manual spot-check that new/changed evidence quotes match the intended signal.
- **Preservation:** Golden pairs (manual validation) should not regress on human judgment (PLAUSIBLE / SLIGHTLY_INFLATED).
- **Friction:** Count of pairs with friction ≥ 1 in the cohort before vs after (exploratory).

**Success gate:** No regression on golden pairs; coverage up on at least 2–3 profiles in the cohort without obvious hallucination. If yes → proceed to a small signal-expansion pilot.

---

## 5. What success would look like

- **Short term (after minimum experiment):** Higher average coverage on the fixed cohort, same or better human judgment on the 4 manual pairs, and at least one new tension or compatibility use case (e.g. conflict or novelty) demonstrable on a few example pairs.

- **Medium term (after first-wave signal expansion):** New signals (e.g. conflictStyle, emotionalAvailability, noveltyVsRoutine, caregivingWarmth, plus 2–4 more) extracted with non-null rates and evidence quality acceptable on a 50–100 profile sample; tension rules or compatibility logic that use them; top-match audit shows fewer FRICTION_TOO_SOFT and better differentiation (e.g. “cynical vs straight” or “activist vs flirt” get friction > 0 where appropriate).

- **Long term:** Match quality improvements attributable to enrichment (coverage, new dimensions) rather than formula tuning alone; user-facing metrics (e.g. accept rate, conversation start, or downstream satisfaction) improve or hold when we reduce reliance on score-only tuning.

---

## 6. Three enrichment directions

### Direction A: First-wave signal expansion

| Aspect | Detail |
|--------|--------|
| **What** | Add 6–8 new extraction signals from `signal-expansion-proposal.md` first wave: conflictStyle, emotionalAvailability, noveltyVsRoutine, caregivingWarmth, intellectualCuriosity, structureChaosTolerance, familyOrientationNuance, controlVsFlexibility. |
| **Expected impact** | **HIGH** — fills gaps that drive FRICTION_TOO_SOFT and daily-fit mismatches; enables tension rules and compatibility logic for conflict, warmth, routine, family, control. |
| **Implementation effort** | **MEDIUM** — add keys to extraction interface and prompt, define protected cues for familyOrientationNuance, wire into compatibility/tension (or shadow mode), re-run extraction on cohort. |
| **Risks** | Overlap with existing signals (emotionalAvailability, familyOrientationNuance); token cost; need to add tension rules to realize impact. |

---

### Direction B: Structured / guided profile content

| Aspect | Detail |
|--------|--------|
| **What** | Add optional short prompts (e.g. “How do you handle disagreement?” “What do you need in a partner?” “Describe your ideal weekend”) so users supply more signal-rich text. Pipeline ingests these as part of aboutMe / aboutRelationship / aboutPartner (or dedicated fields) and runs same extraction. |
| **Expected impact** | **MEDIUM** — reduces SPARSE_INFLATION and GENERIC_VS_SPECIFIC by increasing coverage and specificity; impact depends on adoption and completion rate. |
| **Implementation effort** | **LARGE** — product/UX for new fields and prompts, backend schema and storage, analytics; extraction itself is unchanged. |
| **Risks** | Low completion or generic answers; more tokens per profile; need to avoid overwhelming users. |

---

### Direction C: Extraction quality on existing text (no new signals)

| Aspect | Detail |
|--------|--------|
| **What** | Improve extraction from current fields only: clearer prompt definitions, “distinct from” for overlap, 2–3 new or tuned text-inference rules, and evidence/priority handling so existing signals are filled more often and more accurately where text supports it. |
| **Expected impact** | **MEDIUM** — better coverage and evidence quality; some friction improvement if rules fire more often; no new dimensions so ceiling is limited. |
| **Implementation effort** | **SMALL** — prompt and rule changes only; no new keys, no product change. |
| **Risks** | Over-inference from weak cues if rules are too aggressive; double-count if definitions blur. |

---

## 7. Recommended first experiment

**Run Direction C (extraction quality on existing text) as the first experiment.**

- **Why:** Lowest effort and no API/schema changes; validates that enrichment *direction* (better profile understanding) can move coverage and preservation metrics before committing to new signals or product changes.
- **Then:** If the minimum experiment (Section 4) passes, run a **small Direction A pilot**: add 4 signals (e.g. conflictStyle, noveltyVsRoutine, intellectualCuriosity, structureChaosTolerance) to extraction and 1–2 tension rules; re-run on the same cohort and compare coverage, friction, and human judgment.
- **Direction B** can follow once we have evidence that (a) extraction quality (C) and (b) signal expansion (A) improve outcomes; then structured prompts add more high-quality input for the same pipeline.
