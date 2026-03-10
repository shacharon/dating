# Signal expansion proposal

**Goal:** Improve match quality by enriching profile understanding rather than further score tuning.

**Scope:** 8–12 new *candidate* signals for extraction. No code or scoring changes in this doc — product-oriented proposal only.

**Current baseline:** 15 official extraction signals (ambition, socialBattery, healthBodyConsciousness, emotionalDepth, attachmentSecurity, directness, independence, traditionalism, financialMindset, relationshipClarity, spirituality, lifestylePace, physicalPriority, statusOrientation) plus derived fusionNeed/boundariesNeed from keywords.

---

## 1. conflictStyle

| Field | Content |
|-------|--------|
| **What it captures** | How someone tends to handle disagreement: avoidant vs confrontational vs collaborative vs “talk it through.” |
| **Why it matters** | Mismatches (e.g. one needs to hash it out, the other shuts down) drive daily friction and resentment; alignment reduces conflict escalation. |
| **Stability** | **Stable** — conflict style is relatively consistent across contexts and inferrable from self-description. |
| **Example phrases** | "talk things through," "no drama," "don't like confrontation," "hash it out," "need time to cool off," "avoid conflict," "direct when we disagree," "prefer to discuss calmly." |
| **Overlap risk** | **MEDIUM** — related to directness (communication) and attachmentSecurity (avoidant vs secure). Keep distinct: directness = how you say things day-to-day; conflictStyle = what you do when there’s actual disagreement. |
| **Priority** | **HIGH** |

---

## 2. emotionalAvailability

| Field | Content |
|-------|--------|
| **What it captures** | Willingness and capacity to be emotionally present, responsive, and “there” for a partner (vs guarded, distant, or inconsistent). |
| **Why it matters** | Strong predictor of relationship satisfaction; pairs well with emotionalDepth (importance of depth) — one can value depth but still be low on availability. |
| **Stability** | **Moderately stable** — can be situational (e.g. after burnout) but often consistent in self-description. |
| **Example phrases** | "emotionally available," "present," "there for you," "guarded," "need my walls," "all in," "slow to open up," "emotionally present," "not ready to be fully there." |
| **Overlap risk** | **HIGH** — emotionalDepth (cares about depth), attachmentSecurity (secure vs avoidant). Different angle: emotionalAvailability = *behavioral* “am I there?”; emotionalDepth = *value* “how much do I care about depth?”; attachment = *style* of bonding. Recommend defining clear boundaries in prompt. |
| **Priority** | **HIGH** |

---

## 3. noveltyVsRoutine

| Field | Content |
|-------|--------|
| **What it captures** | Preference for novelty, spontaneity, and change vs routine, predictability, and structure in daily life and plans. |
| **Why it matters** | Drives compatibility in how couples plan weekends, travel, and handle “same vs new”; large gaps cause frustration on both sides. |
| **Stability** | **Stable** — fairly trait-like; people describe themselves reliably on this axis. |
| **Example phrases** | "love spontaneity," "routine person," "need predictability," "same coffee place every day," "always trying something new," "surprise me," "structured week," "go with the flow," "plan everything." |
| **Overlap risk** | **MEDIUM** — lifestylePace (slow vs fast) and independence (space/autonomy). NoveltyVsRoutine is specifically *content* of life (same vs new), not speed or alone-time. |
| **Priority** | **HIGH** |

---

## 4. caregivingWarmth

| Field | Content |
|-------|--------|
| **What it captures** | Tendency to express care, nurture, and warmth — both giving and valuing receiving (e.g. “someone who takes care of me,” “I’m the caretaker”). |
| **Why it matters** | Complements emotionalDepth/emotionalAvailability; mismatch (e.g. one very nurturing, one low need for warmth) affects daily satisfaction and stress. |
| **Stability** | **Stable** — self-reported warmth/caregiving style is relatively consistent. |
| **Example phrases** | "nurturing," "take care of each other," "someone who takes care of me," "warm," "cuddly," "affectionate," "not very touchy," "show love through acts," "quality time as care." |
| **Overlap risk** | **MEDIUM** — emotionalDepth, attachmentSecurity. CaregivingWarmth is behavioral/relational (how we give/receive care), not depth of feeling or attachment style. |
| **Priority** | **HIGH** |

---

## 5. intellectualCuriosity

| Field | Content |
|-------|--------|
| **What it captures** | Importance and style of intellectual engagement: loving ideas, learning, debate, books, “deep conversations” vs preferring practical or light topics. |
| **Why it matters** | Often a stated desire (“someone I can talk to for hours”); mismatch leads to boredom or pressure on one side. |
| **Stability** | **Stable** — people reliably describe whether they’re “into ideas” or not. |
| **Example phrases** | "love deep conversations," "curious about everything," "read a lot," "into ideas," "philosophy," "not into small talk," "learn together," "debate," "abstract thinking," "practical, not a big reader." |
| **Overlap risk** | **LOW** — no direct existing signal; emotionalDepth is about emotion, not intellect. |
| **Priority** | **HIGH** |

---

## 6. socialEnergyNuance

| Field | Content |
|-------|--------|
| **What it captures** | *Quality* of social preference: deep one-on-one vs group/party, small circles vs wide network, “people person but need recharge” vs “always on.” |
| **Why it matters** | socialBattery is mostly *quantity* (high vs low). Nuance distinguishes “low battery but loves deep 1:1” from “low battery and wants to be alone” — different match implications. |
| **Stability** | **Moderately stable** — can be noisier than socialBattery if text is vague. |
| **Example phrases** | "deep one-on-ones," "small circle," "party person," "prefer small gatherings," "lots of acquaintances," "quality over quantity in friendships," "recharge alone," "recharge with close friends." |
| **Overlap risk** | **HIGH** — socialBattery. Must be defined as a *second dimension* (e.g. 1–10: prefer small/deep ↔ prefer large/varied); otherwise merge into socialBattery with richer prompt. |
| **Priority** | **MEDIUM** — high value but overlap risk; consider as optional or sub-dimension of socialBattery. |

---

## 7. structureChaosTolerance

| Field | Content |
|-------|--------|
| **What it captures** | Tolerance for mess, unpredictability, and loose structure in life (home, schedule, plans) vs need for order and clarity. |
| **Why it matters** | Cohabitation and daily friction; “chaos-tolerant” vs “needs order” is a common couple complaint. |
| **Stability** | **Stable** — well-described in profiles when present. |
| **Example phrases** | "organized," "need order," "mess doesn’t bother me," "go with the flow," "structured," "flexible with plans," "clean home matters," "organized chaos," "last-minute plans are fine." |
| **Overlap risk** | **MEDIUM** — lifestylePace (speed), noveltyVsRoutine (same vs new). StructureChaosTolerance is about *order vs mess* and plan rigidity, not pace or novelty. |
| **Priority** | **HIGH** |

---

## 8. familyOrientationNuance

| Field | Content |
|-------|--------|
| **What it captures** | Desire for children, role of family in life, “family person” vs “my own unit” — distinct from relationshipClarity (wants LTR) and traditionalism (values/convention). |
| **Why it matters** | Dealbreaker territory; relationshipClarity says “wants something serious” but not “wants kids” or “family-centric.” |
| **Stability** | **Stable** when stated; often null when not mentioned. |
| **Example phrases** | "want kids," "family person," "close with family," "my own unit," "don’t want children," "family is everything," "independent from family," "see family every week." |
| **Overlap risk** | **HIGH** — relationshipClarity, traditionalism. Define narrowly: kids yes/no/flexible + weight of extended family in life. |
| **Priority** | **HIGH** — critical for filtering; keep definition tight to avoid double-count with relationshipClarity. |

---

## 9. humorPlayfulness

| Field | Content |
|-------|--------|
| **What it captures** | Importance and style of humor and playfulness: silly, sarcastic, dry, “don’t take ourselves too seriously,” vs more serious or reserved. |
| **Why it matters** | Frequently mentioned in “what I want”; style mismatch (sarcasm vs literal) can annoy; alignment supports resilience. |
| **Stability** | **Moderately stable** — style is stable; “importance” can be inferred. |
| **Example phrases** | "sense of humor," "silly together," "dry humor," "don’t take life too seriously," "sarcasm," "playful," "light-hearted," "serious when it matters," "we laugh a lot." |
| **Overlap risk** | **LOW** — no direct overlap; lifestylePace (fun vs calm) is different from humor *style*. |
| **Priority** | **MEDIUM** |

---

## 10. controlVsFlexibility

| Field | Content |
|-------|--------|
| **What it captures** | Need for control over plans, decisions, and outcomes vs comfort with shared control, delegation, and flexibility. |
| **Why it matters** | Couples clash over “who decides,” travel, and life choices; alignment reduces power struggles. |
| **Stability** | **Stable** when described; can be implicit in “type A,” “go with the flow.” |
| **Example phrases** | "type A," "like to be in control," "go with the flow," "decide together," "need to have a say," "flexible," "take the lead," "share decisions," "easygoing about plans." |
| **Overlap risk** | **MEDIUM** — noveltyVsRoutine (same vs new), structureChaosTolerance (order vs mess). ControlVsFlexibility is about *who decides* and need for agency, not content of plans or tidiness. |
| **Priority** | **HIGH** |

---

## 11. expressivenessAffection

| Field | Content |
|-------|--------|
| **What it captures** | How much someone expresses affection outwardly (words, touch, gestures) and values receiving such expression. |
| **Why it matters** | Love-language style; mismatch (e.g. one very verbal/touchy, one shows by actions) is a classic source of “I don’t feel loved.” |
| **Stability** | **Stable** — people often describe “verbal,” “physical touch,” “acts of service.” |
| **Example phrases** | "words of affirmation," "physical touch," "show affection openly," "not big on PDA," "express love through actions," "touchy," "verbal," "affectionate," "reserved with displays." |
| **Overlap risk** | **MEDIUM** — caregivingWarmth (nurture/care). ExpressivenessAffection is *how* affection is shown (modality); caregivingWarmth is *amount/importance* of care. Can be one combined “warmth/affection” signal with sub-dimensions if needed. |
| **Priority** | **MEDIUM** |

---

## 12. resilienceCopingStyle

| Field | Content |
|-------|--------|
| **What it captures** | How someone copes with stress: problem-solving vs emotional processing, “bounce back” vs “need to talk it out,” optimism vs realism. |
| **Why it matters** | Under stress, mismatched coping (one wants to fix, one wants to vent) increases conflict; alignment supports weathering crises. |
| **Stability** | **Moderately stable** — can be inferred from “how I handle hard times” but not always present in text. |
| **Example phrases** | "problem-solver," "need to talk it through," "bounce back quickly," "optimist," "realist," "when things get hard," "support each other through tough times," "fix things vs listen." |
| **Overlap risk** | **MEDIUM** — conflictStyle (how we disagree), emotionalAvailability. Resilience is about *stress/crisis* coping, not daily disagreement or presence. |
| **Priority** | **LOW** — valuable but fewer explicit cues; consider in a second wave. |

---

## Summary table

| # | Signal | Priority | Overlap risk | Stability |
|---|--------|----------|--------------|-----------|
| 1 | conflictStyle | HIGH | MEDIUM | Stable |
| 2 | emotionalAvailability | HIGH | HIGH | Moderate |
| 3 | noveltyVsRoutine | HIGH | MEDIUM | Stable |
| 4 | caregivingWarmth | HIGH | MEDIUM | Stable |
| 5 | intellectualCuriosity | HIGH | LOW | Stable |
| 6 | socialEnergyNuance | MEDIUM | HIGH | Moderate |
| 7 | structureChaosTolerance | HIGH | MEDIUM | Stable |
| 8 | familyOrientationNuance | HIGH | HIGH | Stable when stated |
| 9 | humorPlayfulness | MEDIUM | LOW | Moderate |
| 10 | controlVsFlexibility | HIGH | MEDIUM | Stable |
| 11 | expressivenessAffection | MEDIUM | MEDIUM | Stable |
| 12 | resilienceCopingStyle | LOW | MEDIUM | Moderate |

---

## Recommended phasing

- **First wave (6–8 signals):** conflictStyle, emotionalAvailability, noveltyVsRoutine, caregivingWarmth, intellectualCuriosity, structureChaosTolerance, familyOrientationNuance, controlVsFlexibility.  
  Addresses the largest gaps (conflict, emotional availability, novelty/routine, care/warmth, intellect, structure, family, control) with manageable overlap if prompt boundaries are clear.

- **Second wave (2–4 signals):** socialEnergyNuance (or fold into socialBattery), humorPlayfulness, expressivenessAffection; optionally resilienceCopingStyle after validating first-wave extraction quality.

---

## Implementation notes (for later)

- Add each new key to `EXTRACTION_SIGNAL_KEYS` and to the extractor system prompt with a crisp definition and 1–2 example phrases.
- For high-overlap signals (emotionalAvailability, familyOrientationNuance, socialEnergyNuance), add “PROTECTED” or “distinct from X” lines in the prompt to avoid conflation.
- Consider protected cues for familyOrientationNuance (only when kids/family explicitly mentioned) to avoid hallucination.
- Re-run extraction on a sample of profiles and inspect evidence before wiring into compatibility or tension rules.
