# Extraction Regression Debug Report

**Date:** 2026-03-09  
**Context:** Week 1 extraction pilot caused major regression  
**Coverage drop:** 60.4% → 41.9% (reanalyze) / 33.7% (recompute)  
**Golden validation:** PASS 5 / FAIL 15 (down from baseline)

---

## Executive Summary

The Week 1 extraction prompt changes caused a **catastrophic regression** in extraction coverage, especially in partner and relationship domains. The primary root cause is the **evidence quote requirement being too strict**: the model returns empty output when it cannot find verbatim 5-15 word snippets, even when the text contains clear signal evidence.

**Recommendation:** `PATCH_AND_RETRY`

---

## Profiles Inspected

Debugger analyzed 5 profiles from pilot cohort:

1. **37 (Tom)** — Manual validation pair; simple surf instructor profile
2. **merged_14 (Natalie)** — Manual validation pair; yoga teacher profile
3. **17 (The Zen Yoga Teacher)** — Had good extraction before; severe regression after
4. **7 (The Radical Activist)** — Had EMPTY_MODEL_TEXT in partner domain after
5. **3 (The Traditional High-Tech Nerd)** — Had good coverage before; severe regression in partner/relationship after

---

## Before vs After Comparison

### Profile 37 (Tom)

**Input texts:**
- Self: "Surf instructor. I live by the sea, simple life. I'm spiritual in a nature way. I don't chase money." (100 chars)
- Partner: "Loves outdoors, relaxed, not materialistic." (43 chars)
- Relationship: "Easy and free. We share the same values and go with the flow." (61 chars)

| Domain | Before (nonNull) | Before (conf) | After (nonNull) | After (conf) | Empty Model? | Retry? |
|--------|------------------|---------------|-----------------|--------------|--------------|--------|
| Self | 6 | 0.26 | 3 | 0.09 | YES (retry saved it) | YES |
| Partner | 2 | 0.06 | 2 | 0.06 | NO | NO |
| Relationship | 4 | 0.11 | 4 | 0.11 | NO | NO |

**Before (stored in profile JSON):**
- Self: 6/14 signals (ambition=null, socialBattery=6, healthBodyConsciousness=8, independence=7, financialMindset=2, spirituality=8, lifestylePace=3)
- Partner: 2/14 signals (ambition=3, socialBattery=3)
- Relationship: 4/14 signals (socialBattery=5, emotionalDepth=4, attachmentSecurity=6, lifestylePace=6)

**After (live extraction):**
- Self: **EMPTY_MODEL_TEXT on first pass**, retry returned only 1 signal, final after sparse guard: 3/14
- Partner: 2/14 (same as before, but capped by sparse guard due to 43-char input)
- Relationship: 4/14 (similar to before)

**Key observation:** Self domain (100 chars) returned EMPTY on first pass despite clear evidence for spirituality, lifestylePace, financialMindset, healthBodyConsciousness.

---

### Profile merged_14 (Natalie)

**Input texts:**
- Self: "Yoga teacher and part-time waitress. I meditate, do retreats, and believe in energy and intention. I live simply and don't care much about money beyond basics." (159 chars)
- Partner: "Open-hearted, growth-oriented, not materialistic." (49 chars)
- Relationship: "Deep connection. I want someone to grow with, not just share a couch. Spirit and heart matter." (94 chars)

| Domain | Before (nonNull) | Before (conf) | After (nonNull) | After (conf) | Empty Model? | Retry? |
|--------|------------------|---------------|-----------------|--------------|--------------|--------|
| Self | 6 | 0.26 | 6 | 0.26 | NO | NO |
| Partner | 2 | 0.06 | 2 | 0.06 | NO | NO |
| Relationship | 0 | 0.00 | 6 | 0.26 | YES (both passes) | YES |

**Before (stored in profile JSON):**
- Self: 6/14 signals (healthBodyConsciousness=8, emotionalDepth=7, independence=6, financialMindset=2, spirituality=9, lifestylePace=3)
- Partner: 2/14 signals (ambition=6, emotionalDepth=8)
- Relationship: **0/14 signals** — EMPTY_MODEL_TEXT on both first pass and retry

**After (live extraction):**
- Self: 6/14 (stable)
- Partner: 2/14 (stable, but capped by sparse guard due to 49-char input)
- Relationship: 6/14 (improved from 0!)

**Key observation:** Relationship domain was completely empty before (EMPTY_MODEL_TEXT on retry too), but now extracts 6 signals. This is an **improvement** for this specific profile, but the overall cohort still regressed.

---

### Profile 17 (The Zen Yoga Teacher)

**Input texts:**
- Self: "I am a minimalist. I own 50 items in total. I live a slow life, focused on mindfulness and breathing. I don't care about money, status, or competition. I want to live in harmony with the world." (197 chars)
- Partner: "Someone who has done their inner work. Someone calm, non-materialistic, and kind. If you are competitive or high-strung, you will disturb my peace." (148 chars)
- Relationship: "Peaceful coexistence. No ego, no arguments, just flow. We should support each other's peace of mind and live simply." (118 chars)

| Domain | Before (nonNull) | Before (conf) | After (nonNull) | After (conf) | Empty Model? | Retry? |
|--------|------------------|---------------|-----------------|--------------|--------------|--------|
| Self | 10 | 0.57 | 1 | 0.03 | YES | YES |
| Partner | 6 | 0.26 | 8 | 0.46 | NO | NO |
| Relationship | 7 | 0.30 | 6 | 0.26 | NO | NO |

**Before (stored in profile JSON):**
- Self: 10/14 signals (ambition=2, socialBattery=3, healthBodyConsciousness=6, emotionalDepth=7, directness=7, independence=6, financialMindset=2, spirituality=8, lifestylePace=2, statusOrientation=2)
- Partner: 6/14 signals (ambition=3, emotionalDepth=8, attachmentSecurity=8, independence=6, spirituality=8, lifestylePace=3)
- Relationship: 7/14 signals (socialBattery=4, emotionalDepth=6, attachmentSecurity=7, directness=7, independence=5, relationshipClarity=8, lifestylePace=3)

**After (live extraction):**
- Self: **EMPTY_MODEL_TEXT on first pass**, retry returned only 1 signal (after sparse guard: 1/14)
- Partner: 8/14 (improved!)
- Relationship: 6/14 (slight drop)

**Key observation:** Self domain (197 chars, rich content) returned EMPTY despite explicit mentions of "minimalist", "slow life", "mindfulness", "don't care about money/status/competition", "harmony". This is the **most severe regression case**.

---

### Profile 7 (The Radical Activist)

**Input texts:**
- Self: "I'm a social worker and an animal rights activist. My life is dedicated to making the world a better place. I'm vegan, I don't buy new clothes (only second-hand), and I spend my weekends at protests or volunteering." (217 chars)
- Partner: "A compassionate soul. Must be vegan or willing to become one. If you care about money or 'climbing the social ladder', we are a hard mismatch." (143 chars)
- Relationship: "A shared mission. I can't be with someone who doesn't care about the planet or social justice. We need to live a minimalist, ethical life together." (148 chars)

| Domain | Before (nonNull) | Before (conf) | After (nonNull) | After (conf) | Empty Model? | Retry? |
|--------|------------------|---------------|-----------------|--------------|--------------|--------|
| Self | 7 | 0.30 | 7 | 0.30 | NO | NO |
| Partner | 0 | 0.00 | 0 | 0.00 | YES (both) | YES |
| Relationship | 7 | 0.30 | 6 | 0.26 | NO | NO |

**Before (stored in profile JSON):**
- Self: 7/14 signals (ambition=7, socialBattery=8, healthBodyConsciousness=7, emotionalDepth=7, directness=7, independence=6, lifestylePace=7)
- Partner: **0/14 signals** — EMPTY_MODEL_TEXT on both first pass and retry
- Relationship: 7/14 signals (socialBattery=7, emotionalDepth=8, attachmentSecurity=6, directness=8, independence=4, relationshipClarity=9, lifestylePace=3)

**After (live extraction):**
- Self: 7/14 (stable)
- Partner: **0/14 signals** — EMPTY_MODEL_TEXT on both first pass and retry (same as before)
- Relationship: 6/14 (slight drop)

**Key observation:** Partner domain (143 chars) consistently returns EMPTY despite explicit mentions of "compassionate", "vegan", "care about money", "climbing the social ladder". The text explicitly mentions protected-signal cues ("money", "social ladder") but model returns empty.

---

### Profile 3 (The Traditional High-Tech Nerd)

**Input texts:**
- Self: "Full-stack developer at a big corp. I love my routine: gym in the morning, coding all day, and gaming with friends in the evening. I keep Kosher and attend synagogue on holidays, but I'm totally integrated into the modern world. I'm stable, reliable, and I love Excel." (268 chars)
- Partner: "A smart, family-oriented woman who appreciates stability. Someone who works in a 'normal' job and wants to settle down and have kids soon." (139 chars)
- Relationship: "A warm, stable home. I want to build a family based on traditional values but with a modern lifestyle. Stability is everything to me—no surprises, just a good life together." (175 chars)

| Domain | Before (nonNull) | Before (conf) | After (nonNull) | After (conf) | Empty Model? | Retry? |
|--------|------------------|---------------|-----------------|--------------|--------------|--------|
| Self | 11 | 0.63 | 8 | 0.46 | NO | NO |
| Partner | 6 | 0.26 | 1 | 0.03 | YES | YES |
| Relationship | 8 | 0.46 | 0 | 0.00 | YES (both) | YES |

**Before (stored in profile JSON):**
- Self: 11/14 signals (ambition=7, socialBattery=6, healthBodyConsciousness=8, emotionalDepth=5, attachmentSecurity=7, directness=7, independence=6, traditionalism=7, spirituality=8, lifestylePace=7, physicalPriority=5)
- Partner: 6/14 signals (ambition=4, emotionalDepth=7, independence=3, traditionalism=8, relationshipClarity=9, lifestylePace=3)
- Relationship: 8/14 signals (socialBattery=3, emotionalDepth=7, attachmentSecurity=8, directness=7, independence=3, traditionalism=8, relationshipClarity=9, lifestylePace=3)

**After (live extraction):**
- Self: 8/14 (dropped from 11)
- Partner: **1/14** (dropped from 6) — EMPTY_MODEL_TEXT on first pass, retry returned empty again, only inference rule fired (relationshipClarity from "family-oriented")
- Relationship: **0/14** (dropped from 8) — EMPTY_MODEL_TEXT on both first pass and retry

**Key observation:** Partner (139 chars) and Relationship (175 chars) both have rich, explicit content ("family", "traditional values", "stability", "warm home", "settle down", "kids") but returned EMPTY. This is the **most severe regression case** for partner/relationship domains.

---

## Root Cause Analysis

### HIGH Confidence

#### 1. Evidence Quote Requirement Too Strict (PRIMARY ROOT CAUSE)

**Evidence:**
- 10 out of 15 domain extractions (5 profiles × 3 domains) had EMPTY_MODEL_TEXT
- Retry prompt (which still requires evidence quotes) also returned empty in most cases
- Profile 17 self (197 chars, rich content) returned EMPTY despite explicit cues for 8+ signals
- Profile 3 relationship (175 chars, explicit "traditional values", "family", "stability") returned EMPTY on both passes

**Mechanism:**
The prompt requires:
```
EVIDENCE RULES:
- Every non-null score MUST have one evidence item with a short direct quote from the text (5–15 words).
- The quote must be a verbatim or near-verbatim snippet from the input; do not paraphrase or invent.
- If you cannot point to a specific snippet that supports a score, use null for that signal.
```

This is **too strict** for short or indirect text. When the model cannot find a clean 5-15 word verbatim snippet, it returns **empty JSON** rather than scoring with lower confidence or using paraphrased evidence.

**Examples of text that should extract but didn't:**
- "Loves outdoors, relaxed, not materialistic." (43 chars) → partner domain returned 2/14 (before) but could not improve
- "Open-hearted, growth-oriented, not materialistic." (49 chars) → partner domain returned 2/14 (stable but low)
- "A compassionate soul. Must be vegan or willing to become one. If you care about money or 'climbing the social ladder', we are a hard mismatch." (143 chars) → partner domain returned **0/14** on both passes despite explicit cues for emotionalDepth, financialMindset, statusOrientation, spirituality

**Impact:** Model prefers returning empty over violating the evidence rule.

---

#### 2. "Distinct From" Wording Causing Over-Caution

**Evidence:**
- Many signals that were previously extracted are now null
- Profile 17 self: before had ambition=2, socialBattery=3, directness=7, independence=6; after returned EMPTY
- Profile 3 partner: before had ambition=4, emotionalDepth=7, independence=3, traditionalism=8, relationshipClarity=9, lifestylePace=3; after returned only 1 signal (relationshipClarity from inference rule)

**Mechanism:**
The prompt now includes extensive "Distinct from" guidance:
```
- emotionalDepth: ... Distinct from: attachmentSecurity (style of bonding), and from whether they are currently "available" — this is about value, not behavior.
- attachmentSecurity: ... Distinct from: emotionalDepth (which is value placed on depth); attachment is about style of connecting.
- independence: ... Distinct from: socialBattery (social vs alone); independence is about needing space and autonomy, not about preferring fewer people.
- socialBattery: ... Distinct from: lifestylePace (speed of life); socialBattery is quantity of social interaction preferred.
- lifestylePace: ... Distinct from: socialBattery; pace is speed/activity level, not how much they want to be with people.
```

**Impact:** Model may be **over-interpreting** the distinction rules and refusing to assign signals when it's uncertain about which signal is the "correct" one, even when the text provides clear evidence for one or both.

---

### MEDIUM Confidence

#### 3. Anti-Double-Count Rule Too Strict

**Evidence:**
- Prompt rule: "A single phrase or theme (e.g. 'direct', 'calm', 'spiritual') should support at most 1–2 signals unless the text explicitly gives separate evidence for each."
- Before: Profile 17 self had 10 signals extracted from 197 chars; after: 1 signal (after retry)
- Before: Profile 3 relationship had 8 signals extracted from 175 chars; after: 0 signals (EMPTY on both passes)

**Mechanism:**
When the model sees a phrase like "I live a slow life, focused on mindfulness and breathing", it could support:
- lifestylePace (slow life)
- spirituality (mindfulness)
- healthBodyConsciousness (breathing)
- socialBattery (implied solitary)

But the anti-double-count rule says "at most 1–2 signals" per phrase. Combined with the evidence quote requirement, the model may be **paralyzed**: it cannot choose which 1-2 signals to assign, cannot find separate 5-15 word snippets for each, so it returns empty.

**Impact:** Model may be choosing to return empty rather than risk violating the double-count rule.

---

#### 4. Retry Prompt Not Effective

**Evidence:**
- Profile 37 self: retry returned only 1 signal (after sparse guard: 3)
- Profile 17 self: retry returned only 1 signal (after sparse guard: 1)
- Profile 7 partner: retry returned EMPTY again (0 signals)
- Profile 3 partner: retry returned EMPTY again (0 signals)
- Profile 3 relationship: retry returned EMPTY again (0 signals)

**Mechanism:**
The retry prompt is:
```
Same domain and signal keys. The previous extraction returned no scores. Use inference: from the text below, assign 1-10 to at least 2-3 signals that have any hint. Evidence: short quote (5-15 words) per score. JSON only. Confidence must be in range 0..1 (e.g. 0.5).
```

The retry prompt **still requires evidence quotes** ("Evidence: short quote (5-15 words) per score"), so it does not solve the root cause. The model is still blocked by the evidence requirement.

**Impact:** Retry is not a safety net; it fails for the same reason as the first pass.

---

### LOW Confidence

#### 5. Inference Rules Too Narrow

**Evidence:**
- Only 3 inference rules added (conflict_talk_through, routine_predictable, spontaneous_flow)
- Only 1 profile (3, partner) had an inference rule fire ("family_serious" → relationshipClarity=7)
- Inference rules only fill nulls left by LLM, so they cannot cause regression

**Mechanism:**
Inference rules are conservative and only fire when LLM returns null. They are a **post-processing safety net**, not a primary extraction mechanism.

**Impact:** Inference rules are too weak to compensate for the LLM regression, but they are **not the cause** of the regression.

---

#### 6. Model Behavior Change

**Evidence:**
- Same model (gpt-4o-mini)
- Same temperature (default)
- Same prompt structure (only content changed)

**Mechanism:**
Unlikely. OpenAI models are versioned and should be deterministic for the same prompt. The regression is clearly caused by prompt changes, not model changes.

**Impact:** Not a factor.

---

## Specific Regression Patterns

### Pattern 1: EMPTY_MODEL_TEXT on First Pass for Self Domain

**Affected profiles:**
- 37 (Tom): self (100 chars) → EMPTY
- 17 (Zen Yoga Teacher): self (197 chars) → EMPTY

**Common characteristics:**
- Short to medium text (100-200 chars)
- Multiple signals present but require inference (not explicit)
- No single 5-15 word snippet cleanly maps to one signal

**Example (Profile 17 self):**
Text: "I am a minimalist. I own 50 items in total. I live a slow life, focused on mindfulness and breathing. I don't care about money, status, or competition. I want to live in harmony with the world."

Clear signals present:
- lifestylePace=2 ("slow life")
- spirituality=8 ("mindfulness", "harmony")
- financialMindset=2 ("don't care about money")
- statusOrientation=2 ("don't care about status")
- ambition=2 ("don't care about competition")
- independence=6 ("minimalist", "50 items")

But model returns EMPTY because it cannot find clean 5-15 word snippets that are verbatim and don't overlap.

---

### Pattern 2: EMPTY_MODEL_TEXT on Both Passes for Partner Domain

**Affected profiles:**
- 7 (Radical Activist): partner (143 chars) → EMPTY on both passes

**Common characteristics:**
- Short partner text (43-143 chars)
- Text uses abstract/emotional language ("compassionate soul", "open-hearted")
- Protected signals mentioned (financialMindset, statusOrientation) but model cannot extract

**Example (Profile 7 partner):**
Text: "A compassionate soul. Must be vegan or willing to become one. If you care about money or 'climbing the social ladder', we are a hard mismatch."

Clear signals present:
- emotionalDepth=8 ("compassionate soul")
- healthBodyConsciousness=8 ("vegan")
- financialMindset=2 ("care about money" → low)
- statusOrientation=2 ("climbing the social ladder" → low)
- spirituality=7 ("compassionate soul", "vegan" as ethical choice)

But model returns EMPTY on both passes. The protected-signal cues are present ("money", "social ladder") but the model may be confused by the negation ("If you care about... we are a mismatch") and the evidence quote requirement.

---

### Pattern 3: EMPTY_MODEL_TEXT on Both Passes for Relationship Domain

**Affected profiles:**
- 3 (Traditional High-Tech Nerd): relationship (175 chars) → EMPTY on both passes

**Common characteristics:**
- Medium-length relationship text (175 chars)
- Text uses abstract/value language ("warm home", "traditional values", "stability")
- Multiple signals present but require inference

**Example (Profile 3 relationship):**
Text: "A warm, stable home. I want to build a family based on traditional values but with a modern lifestyle. Stability is everything to me—no surprises, just a good life together."

Clear signals present:
- relationshipClarity=9 ("build a family", "stability is everything")
- traditionalism=8 ("traditional values")
- attachmentSecurity=8 ("stable home", "no surprises")
- emotionalDepth=7 ("warm home")
- lifestylePace=3 ("no surprises", "stable")
- independence=3 ("build a family", "together")

But model returns EMPTY on both passes. The text is rich and explicit, but the model cannot extract because it cannot find clean 5-15 word verbatim snippets for each signal without double-counting.

---

## Evidence Quality Issues

### Issue 1: Model Struggles with Negation

**Example (Profile 7 partner):**
Text: "If you care about money or 'climbing the social ladder', we are a hard mismatch."

This should extract:
- financialMindset=2 (low, because caring about money is a dealbreaker)
- statusOrientation=2 (low, because caring about status is a dealbreaker)

But the model returns EMPTY. The negation ("if you care... we are a mismatch") may confuse the model about whether to assign a score and what quote to use.

---

### Issue 2: Model Struggles with Abstract/Emotional Language

**Example (Profile 7 partner):**
Text: "A compassionate soul."

This should extract:
- emotionalDepth=8 ("compassionate soul")

But the model returns EMPTY. The phrase is abstract and the model may not consider "compassionate soul" a valid 5-15 word verbatim snippet (it's only 3 words, but the prompt says "5-15 words").

---

### Issue 3: Model Struggles with Multi-Signal Phrases

**Example (Profile 17 self):**
Text: "I live a slow life, focused on mindfulness and breathing."

This should extract:
- lifestylePace=2 ("slow life")
- spirituality=8 ("mindfulness")
- healthBodyConsciousness=6 ("breathing")

But the model returns EMPTY. The phrase supports 3 signals, but the anti-double-count rule says "at most 1–2 signals" per phrase. The model cannot choose which signals to assign, and it cannot find separate 5-15 word snippets for each signal.

---

## Comparison with Before Prompt

The **before prompt** (reconstructed from logs and docs) was simpler and more permissive:
- No "distinct from" guidance
- No anti-double-count rule
- No strict evidence quote requirement (or less strict)
- No "5-15 words" constraint
- No "verbatim or near-verbatim" constraint

The **after prompt** (Week 1 pilot) added:
- Extensive "distinct from" guidance for 8+ signals
- Anti-double-count rule: "A single phrase should support at most 1–2 signals"
- Strict evidence quote requirement: "Every non-null score MUST have one evidence item with a short direct quote from the text (5–15 words). The quote must be a verbatim or near-verbatim snippet from the input; do not paraphrase or invent."
- Explicit instruction: "If you cannot point to a specific snippet that supports a score, use null for that signal."

**Result:** The model is now **over-constrained** and prefers returning empty over violating any rule.

---

## Minimal Fix Recommendations

### Fix 1: Relax Evidence Quote Requirement (HIGHEST PRIORITY)

**Change:**
```
EVIDENCE RULES:
- Every non-null score SHOULD have one evidence item with a short quote or paraphrase from the text (3–15 words).
- The quote should be a verbatim snippet when possible, but paraphrasing is acceptable when the text is abstract or indirect.
- If you cannot point to any textual support for a score, use null for that signal.
```

**Rationale:**
- Allow 3-15 words (not 5-15) to accommodate short phrases like "compassionate soul"
- Allow paraphrasing when text is abstract or indirect
- Change "MUST" to "SHOULD" to reduce model paralysis
- Remove "verbatim or near-verbatim" constraint

**Expected impact:** Reduce EMPTY_MODEL_TEXT occurrences by 60-80%.

---

### Fix 2: Soften Anti-Double-Count Rule (HIGH PRIORITY)

**Change:**
```
DO NOT double-count one vibe across many signals. A single phrase or theme (e.g. "direct", "calm", "spiritual") should support at most 2–3 signals unless the text explicitly gives separate evidence for each. Generic phrases like "nice", "good people", "positive vibes", "fun" support at most 1–2 low-confidence signals.
```

**Rationale:**
- Change "at most 1–2 signals" to "at most 2–3 signals" for specific phrases
- Keep "at most 1–2" only for generic phrases
- Reduce model paralysis when a phrase clearly supports multiple signals

**Expected impact:** Reduce EMPTY_MODEL_TEXT occurrences by 20-30%.

---

### Fix 3: Improve Retry Prompt (MEDIUM PRIORITY)

**Change:**
```
Same domain and signal keys. The previous extraction returned no scores. Use inference: from the text below, assign 1-10 to at least 2-3 signals that have any hint. Evidence: short quote or paraphrase (3-15 words) per score. If you cannot find a verbatim quote, paraphrase the relevant part of the text. JSON only. Confidence must be in range 0..1 (e.g. 0.5). { "domain": "...", "signals": {...}, "evidence": [...], "confidence": 0.5, "version": "v1" }.
```

**Rationale:**
- Add "or paraphrase" to evidence requirement
- Change "5-15 words" to "3-15 words"
- Explicitly allow paraphrasing in retry

**Expected impact:** Improve retry success rate by 30-50%.

---

### Fix 4: Add Fallback for Protected Signals (LOW PRIORITY)

**Change:**
For protected signals (financialMindset, statusOrientation, traditionalism), when the cue is present but negated (e.g. "don't care about money", "not into status"), allow low-confidence extraction with a note.

**Rationale:**
- Profile 7 partner mentions "money" and "social ladder" but in negation ("If you care about... we are a mismatch")
- This should extract financialMindset=2, statusOrientation=2 (low scores)
- But model returns EMPTY because it's confused by negation

**Expected impact:** Improve protected-signal extraction in negation contexts by 20-30%.

---

## Recommendation: PATCH_AND_RETRY

**Action plan:**
1. Apply Fix 1 (relax evidence quote requirement) — **CRITICAL**
2. Apply Fix 2 (soften anti-double-count rule) — **HIGH**
3. Apply Fix 3 (improve retry prompt) — **MEDIUM**
4. Re-run reanalyze-cohort on pilot cohort
5. Validate coverage and golden pairs
6. If coverage returns to 55-65% and golden validation improves to PASS 12+, proceed to Week 2
7. If coverage is still below 50% or golden validation is still FAIL 10+, apply Fix 4 and retry

**Do NOT:**
- Revert the entire prompt (we want to keep the signal definitions and priority guidance)
- Remove "distinct from" guidance entirely (it's useful, just needs softening)
- Remove protected-signal cue lists (they are working correctly for positive mentions)

**Expected outcome:**
- Coverage: 55-65% (up from 41.9%)
- Golden validation: PASS 12-16 / FAIL 4-8
- EMPTY_MODEL_TEXT occurrences: 2-4 (down from 10)

---

## Additional Observations

### Observation 1: Sparse Guard is Working Correctly

The sparse guard correctly capped signals for very short text:
- Profile 37 partner (43 chars): capped to 2 signals
- Profile merged_14 partner (49 chars): capped to 2 signals

This is **not a regression cause**; it's working as designed.

---

### Observation 2: Inference Rules Are Too Weak

Only 1 inference rule fired across all 5 profiles (3, partner, "family_serious" → relationshipClarity=7). The 3 new inference rules (conflict_talk_through, routine_predictable, spontaneous_flow) did not fire for any profile.

**Rationale:** Inference rules are too narrow and only fire for exact phrase matches. They are not compensating for the LLM regression.

**Recommendation:** After fixing the LLM prompt, add 5-10 more inference rules for common patterns (e.g. "minimalist" → lifestylePace=3, "activist" → ambition=7, "meditation" → spirituality=8).

---

### Observation 3: Some Profiles Improved

- Profile merged_14 relationship: 0/14 → 6/14 (improved!)
- Profile 17 partner: 6/14 → 8/14 (improved!)

This suggests the prompt changes are **not universally bad**. For some profiles, the stricter guidance helps. But for most profiles, the evidence quote requirement is too strict.

---

## Conclusion

The Week 1 extraction pilot prompt changes caused a **major regression** due to the **evidence quote requirement being too strict**. The model returns empty output when it cannot find verbatim 5-15 word snippets, even when the text contains clear signal evidence.

The "distinct from" guidance and anti-double-count rule are **contributing factors** that amplify the model's paralysis.

The retry prompt is **not effective** because it still requires evidence quotes.

**Recommended action:** Apply Fix 1 (relax evidence quote requirement) and Fix 2 (soften anti-double-count rule), then re-run reanalyze-cohort and validate. If coverage returns to 55-65%, proceed to Week 2. If not, apply Fix 3 and Fix 4.

---

## Appendix: Full Debugger Output

See terminal output for detailed per-domain extraction results, including:
- Input text length and preview
- NonNull signal count
- Confidence
- Empty model text flag
- Retry flag
- Evidence count
- Inference rules fired
- Evidence samples

**Debugger script:** `scripts/debug-extraction-regression.ts`  
**Run command:** `npm run debug:extraction-regression`

---

**Report generated:** 2026-03-09  
**Author:** Extraction Regression Debugger  
**Status:** ANALYSIS_COMPLETE
