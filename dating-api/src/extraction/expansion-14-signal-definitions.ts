/**
 * Expansion-14 promotion-ready metadata + LLM semantic prompt blocks (shadow until promote).
 * LLM-first only — no keyword heuristics.
 */

export const EXPANSION_14_SHADOW_SIGNAL_KEYS = [
  'patienceTolerance',
  'intimacyPacing',
  'monogamyAlignment',
] as const;

export type Expansion14ShadowSignalKey =
  (typeof EXPANSION_14_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_14_PROMOTION_WEIGHTS: Record<
  Expansion14ShadowSignalKey,
  number
> = {
  patienceTolerance: 1.2,
  intimacyPacing: 1.3,
  monogamyAlignment: 1.6,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_14_PROMOTION_TIERS: Record<
  Expansion14ShadowSignalKey,
  1 | 2 | 3
> = {
  patienceTolerance: 2,
  intimacyPacing: 1,
  monogamyAlignment: 1,
};

export const EXPANSION_14_PROMOTION_DOMAINS: Record<
  Expansion14ShadowSignalKey,
  string
> = {
  patienceTolerance: 'relationship',
  intimacyPacing: 'intimacy',
  monogamyAlignment: 'relationship',
};

export const EXPANSION_14_PROMOTION_CHIP_LABELS: Record<
  Expansion14ShadowSignalKey,
  string
> = {
  patienceTolerance: 'Patience with differences',
  intimacyPacing: 'Pace of closeness',
  monogamyAlignment: 'Relationship structure',
};

/**
 * Expansion-14 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-14 Tolerance & Intimacy Pacing (extract when evidence exists; NOT used for scoring; 1–10 or null):

- patienceTolerance: day-to-day tolerance for a partner's flaws, quirks, and differences
  vs low tolerance / critical stance toward imperfection.
  1–2 = highly critical; low tolerance for differences or imperfection.
  3–4 = some patience but easily frustrated by quirks.
  5–6 = moderate tolerance.
  7–8 = generally patient and accepting of differences.
  9–10 = very patient; easily accepts partner's flaws and quirks.
  PROTECTED — distinct from:
    conflictStyle (behavior DURING disagreement / how they fight — NOT ongoing tolerance for quirks that never become "a fight");
    emotionalRegulation (managing one's own reactivity under stress — NOT tolerance threshold for partner's imperfections).
  Prefer null when tolerance / reaction-to-flaws stance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אף אחד לא מושלם, אני מנסה להיות מבין/ה לגבי הדברים הקטנים".

- intimacyPacing: preferred speed toward emotional and/or physical closeness in a new
  relationship — slow/cautious vs fast.
  1–2 = very slow; takes a long time to open up or get physically close.
  3–4 = cautious pace.
  5–6 = moderate pace.
  7–8 = moves fairly quickly toward closeness.
  9–10 = very fast; dives into closeness quickly.
  PROTECTED — distinct from:
    casualIntimacyIntent (casual/hookup vs committed-only *type* of intimacy — NOT *speed* to closeness;
      someone can want committed intimacy and still move slowly or quickly).
  Prefer null when pacing preference is unmentioned.
  Do not invent pacing from affection needs or casual-vs-committed stance alone.
  Hebrew meaning examples (do not keyword-match): "אני לוקח/ת את הדברים לאט, צריך/ה זמן לפני שאני נפתח/ת".

- monogamyAlignment: expectation of relationship structure — strict exclusivity vs openness
  to non-monogamous / poly structures.
  SCALE POLARITY (do not invert): LOW = monogamous / exclusive; HIGH = open / poly.
  1–2 = strictly monogamous; exclusivity is non-negotiable.
  3–4 = monogamous-leaning, minimal flexibility.
  5–6 = open to discussion / hasn't decided.
  7–8 = leans open / non-monogamous.
  9–10 = explicitly seeks open / poly relationship structure.
  PROTECTED — distinct from:
    relationshipClarity (wanting labels, boundaries, transparency, intentional dating *approach* —
      NOT exclusive-vs-open/poly *structure* preference alone).
  Prefer null when exclusivity / open-structure stance is unmentioned.
  "Exclusive / monogamous only" without open/poly language → LOW band when explicit.
  "Ethically non-monogamous / poly / open relationship" → HIGH band when explicit.
  Hebrew meaning examples (do not keyword-match): "מחפש/ת קשר מחויב ובלעדי בלבד".

Prefer null over stretched scoring for all Expansion-14 keys.
`;

/**
 * Expansion-14 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-14 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- patienceTolerance: desired partner patience / acceptance of quirks and differences
  (highly critical LOW ↔ very patient / accepting HIGH)
- intimacyPacing: desired partner pace toward closeness
  (very slow/cautious LOW ↔ moves fast into closeness HIGH)
- monogamyAlignment: desired partner structure expectation
  (strict mono/exclusive LOW ↔ open/poly HIGH — do not invert)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-14 self definitions.
CRITICAL: partner conflict / fight-style language alone → conflictStyle territory — NOT patienceTolerance
  unless day-to-day tolerance for flaws/quirks (outside fights) is explicit.
CRITICAL: partner casual vs committed-intimacy type alone → casualIntimacyIntent — NOT intimacyPacing
  unless speed-to-closeness is explicit.
CRITICAL: partner wanting labels / clarity / "know where we stand" alone → relationshipClarity — NOT monogamyAlignment
  unless exclusive-vs-open/poly structure stance is explicit.
Prefer null over stretched scoring. Do not invent tolerance, pacing, or monogamy scores from silence.
`;
