# Manual review: Tom #37 vs Natalie #merged_14

## Profile texts (from seed data)

**Tom #37**  
- About me: Surf instructor. Live by the sea, simple life. Spiritual in a nature way. Don’t chase money.  
- About partner: Loves outdoors, relaxed, not materialistic.  
- About relationship: **Easy and free. Same values, go with the flow.**

**Natalie #merged_14**  
- About me: Yoga teacher, part-time waitress. Meditate, retreats, energy and intention. Live simply, don’t care much about money beyond basics.  
- About partner: Open-hearted, growth-oriented, not materialistic.  
- About relationship: **Deep connection. Someone to grow with, not just share a couch. Spirit and heart matter.**

## Engine result

- A→B = 93, B→A = 93  
- Relationship = 80  
- Coverage = 64%  
- Friction = 0  
- Compatibility = 91  

---

## 1. Human judgment: fair score or inflated?

**Verdict: Slightly inflated.**

- **Genuine overlap:** Simple life, low materialism, spirituality, outdoors/body-mind vibe. That legitimately supports a high score (e.g. mid–high 80s).
- **Why it’s a bit high:** Tom’s “easy, go with the flow” vs Natalie’s “deep connection, grow with, not just share a couch” is a real relationship-style difference: **ease/casual** vs **depth/intentional**. The model uses a single number per signal (e.g. emotionalDepth, relationshipClarity). If extraction gives both similar values (e.g. 6–7), they get high pairScores even though the *meaning* differs (relaxed vs growth-oriented). So the same numeric band is treated as full alignment and pushes the score into the low 90s instead of capping it a bit lower (e.g. 82–86) to reflect that nuance.

---

## 2. Over-rewarding shared “lifestyle vibe” signals?

**Yes.**

- One underlying theme—“simple life, not materialistic, spiritual”—likely drives several signals at once:
  - **lifestylePace** (simple, not hectic)
  - **financialMindset** (don’t chase money)
  - **spirituality** (nature / energy / intention)
  - **statusOrientation** (low materialism)
- All of these have weight ≥ 1.2 in `COMPATIBILITY_WEIGHTS` (spirituality, financialMindset, lifestylePace = 1.5). So the same lifestyle choice is rewarded in **multiple** dimensions. That’s not wrong per se, but it **over-rewards** a single vibe when it appears across several signals, and can push A→B/B→A toward 93 when a single “values overlap” dimension might warrant a lower combined effect.

**Exact signals likely over-weighted:**  
`spirituality`, `financialMindset`, `lifestylePace`, and to a lesser extent `statusOrientation` when they all align on “simple, spiritual, non-materialistic.”

---

## 3. Double-counting (spirituality / low materialism / simple life)?

**Yes.**

- **Tier1 (valuesAlignment)** = traditionalism, financialMindset, relationshipClarity, lifestylePace, spirituality, attachmentSecurity.
- **Main compatibility** = weighted average over all 14 signals, including those same Tier1 keys.
- So **spirituality**, **financialMindset**, **lifestylePace** (and possibly relationshipClarity) contribute to:
  1. **A→B and B→A** (70% of compatibility blend),
  2. **valuesAlignment** (10% of compatibility blend).
- The same “simple / spiritual / non-materialistic” alignment is therefore counted **twice**: once inside the directional scores and again in the 10% valuesAlignment term. That inflates compatibility by a few points compared to counting that cluster once.

**File:** `src/compatibility/compatibility-score.ts` (TIER1_KEYS and weights); `src/engine/scoring.ts` (compatibility formula 0.35+0.35+0.2+0.1).

---

## 4. Friction = 0 too permissive given relationship-style nuance?

**Yes, in this pair.**

- **Tension rules** (e.g. emotional_depth_gap, attachment_anxiety_vs_directness) fire on **numeric gaps** (e.g. |a−b| ≥ 4) or thresholds. They do not encode “easy vs intentional” directly.
- If extraction gives both similar **emotionalDepth** and **relationshipClarity** (e.g. 6–7), no rule fires → **friction = 0**.
- So the engine can report friction=0 even when the **qualitative** difference (“go with the flow” vs “grow with, deep connection”) is real. Friction is therefore **too permissive** when the mismatch is in relationship *style* rather than in a single signal crossing a gap threshold.

**Files:** `src/engine/tension-rules.ts` (all rules); `src/engine/compute-friction.ts` (sum of rule penalties). No rule currently targets “ease vs intentional depth” as a distinct dimension.

---

## 5. “Why it works”: strongest signals or weaker proxies?

**Likely surfacing proxies.**

- “Why it works” = top 3 alignments with **pairScore ≥ 8** (match-engine.ts, alignments from compatAB.breakdown).
- If **lifestylePace**, **spirituality**, **financialMindset** all have pairScore 9–10 (same “simple life” vibe), they dominate the top 3.
- The dimension where Tom and Natalie **differ** (relationship style: ease vs depth) might sit in **emotionalDepth** or **relationshipClarity** with a slightly lower pairScore (e.g. 7) and then **not** appear in “Why it works.”
- So we surface the **shared vibe** (strong on 3–4 signals) and **do not** surface the nuance that would explain why the match isn’t perfect. That makes “Why it works” a bit **misleading**: it highlights proxies (lifestyle overlap) rather than the most discriminative or cautionary dimension.

**File:** `src/matches/match-engine.ts` (alignments: filter pairScore >= 8, sort desc, slice 0,3).

---

## Minimal fix (no broad refactor)

### 1. Reduce double-counting of Tier1 in compatibility (small change)

- **Idea:** Do not re-add Tier1 again in valuesAlignment when they already drive A→B/B→A. For example, compute valuesAlignment from a **subset** of Tier1 that is less correlated with the main vibe (e.g. exclude spirituality and lifestylePace from valuesAlignment and keep only traditionalism, financialMindset, relationshipClarity, attachmentSecurity), **or** reduce the weight of valuesAlignment from 0.10 to 0.05 so the double-count has less impact.
- **Minimal option:** In `src/engine/scoring.ts`, change the compatibility formula to use **0.05** instead of **0.10** for valuesAlignment, and give the freed 0.05 to relationshipFit (e.g. 0.25) so relationship-style (where Tom vs Natalie differ) matters more. That keeps the same inputs but lowers inflation from Tier1 double-count.

### 2. Friction floor when coverage is moderate and relationship-style nuance is likely (optional)

- We already have a sparse-match friction floor in the audit (e.g. friction ≥ 1 when coverage < 50%). You could add a **small** floor (e.g. friction ≥ 1) when **both** coverage is in a middle band (e.g. 50–70%) **and** relationshipFit is high while aToB and bToA are very high—so we don’t give friction=0 to “looks perfect on paper but might have style mismatch.” This is heuristic and optional; the main minimal fix is (1).

### 3. “Why it works”: surface one tension or lower-alignment signal (optional)

- To avoid showing only the strongest proxies, you could add a single “Consider” or “Nuance” line when there exists a tension or a signal with pairScore in the 6–7 band (below the top 3), so the UI doesn’t imply perfect alignment on every dimension. This is a product/UI tweak rather than a scoring change.

---

## Summary

| Question | Answer |
|----------|--------|
| Fair or inflated? | **Slightly inflated** (low 90s vs more like 82–86) due to relationship-style nuance (easy vs intentional) not reducing the score. |
| Signals over-weighted? | **spirituality, financialMindset, lifestylePace** (and to a lesser extent statusOrientation) when they all reflect the same “simple / spiritual / non-materialistic” vibe. |
| Double-counting? | **Yes:** Tier1 (spirituality, financialMindset, lifestylePace) in both directional scores and in valuesAlignment (10%). |
| Friction=0 too permissive? | **Yes** when the mismatch is “easy vs deep/intentional” and no rule fires on numeric gaps. |
| “Why it works” surface best signals? | **No:** it surfaces top pairScores (shared vibe) and can omit the dimension where they differ (relationship style). |
| Minimal fix | **Reduce valuesAlignment weight** (e.g. 0.10 → 0.05) and shift to relationshipFit to reduce Tier1 double-count and slightly boost relationship-style impact; optionally add a small friction floor or “nuance” in the UI. |
