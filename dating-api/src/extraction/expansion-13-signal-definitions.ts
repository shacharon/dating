/**
 * Expansion-13 promotion-ready metadata + LLM semantic prompt blocks (shadow until promote).
 * LLM-first only — no keyword heuristics.
 */

export const EXPANSION_13_SHADOW_SIGNAL_KEYS = [
  'growthMindset',
  'selfAwareness',
] as const;

export type Expansion13ShadowSignalKey =
  (typeof EXPANSION_13_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_13_PROMOTION_WEIGHTS: Record<
  Expansion13ShadowSignalKey,
  number
> = {
  growthMindset: 1.3,
  selfAwareness: 1.2,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_13_PROMOTION_TIERS: Record<
  Expansion13ShadowSignalKey,
  1 | 2 | 3
> = {
  growthMindset: 2,
  selfAwareness: 2,
};

export const EXPANSION_13_PROMOTION_DOMAINS: Record<
  Expansion13ShadowSignalKey,
  string
> = {
  growthMindset: 'personal',
  selfAwareness: 'personal',
};

export const EXPANSION_13_PROMOTION_CHIP_LABELS: Record<
  Expansion13ShadowSignalKey,
  string
> = {
  growthMindset: 'Openness to growth',
  selfAwareness: 'Self-awareness',
};

/**
 * Expansion-13 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-13 Growth & Self-Awareness (extract when evidence exists; NOT used for scoring; 1–10 or null):

- growthMindset: openness to feedback, willingness to change and learn from
  mistakes in a relationship vs defensiveness / fixed "this is who I am".
  1–2 = defensive; resists feedback; refuses to change.
  3–4 = occasionally open, mostly resistant.
  5–6 = moderately open to change.
  7–8 = actively seeks feedback and works on self-improvement as a partner.
  9–10 = strongly growth-oriented; regularly reflects and adapts based on feedback.
  PROTECTED — distinct from:
    vulnerabilityOpenness (willingness to share fears / be seen — NOT willingness to change / take feedback);
    directness (how they speak / say hard things — NOT receptivity to feedback).
  Prefer null when change/feedback/self-improvement stance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני תמיד עובד על להיות בן/בת זוג טוב/ה יותר".

- selfAwareness: understanding of one's own emotional patterns, triggers, and
  behavioral tendencies vs little insight / surprised by own reactions.
  1–2 = little insight into own patterns; surprised by own reactions.
  3–4 = limited self-reflection.
  5–6 = some awareness of patterns.
  7–8 = clearly names own triggers/tendencies ("I tend to shut down when...").
  9–10 = deep self-insight; articulates patterns and their origins.
  PROTECTED — distinct from:
    emotionalRegulation (managing emotions in the moment — NOT *knowing* one's patterns;
      insight without regulation, or regulation without insight, both possible);
    empathyCompassion (outward understanding of others — NOT inward understanding of self).
  Prefer null when self-reflective pattern language is unmentioned.
  Do not invent high self-awareness from silence or from empathy alone.
  Hebrew meaning examples (do not keyword-match): "אני יודע/ת שאני נוטה להיות מגונן/ת כשאני מרגיש/ה שמבקרים אותי".

Prefer null over stretched scoring for all Expansion-13 keys.
`;

/**
 * Expansion-13 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-13 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- growthMindset: desired partner openness to feedback / willingness to change
  (defensive / fixed LOW ↔ actively seeks feedback and grows HIGH)
- selfAwareness: desired partner insight into own patterns/triggers
  (little insight LOW ↔ clearly names patterns / origins HIGH)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-13 self definitions.
CRITICAL: partner vulnerability / sharing-fears language alone → vulnerabilityOpenness territory — NOT growthMindset
  unless feedback / change / self-improvement stance is explicit.
CRITICAL: partner emotional steadiness / calm-under-stress alone does NOT equal selfAwareness.
CRITICAL: partner empathy / caring-about-others alone does NOT equal selfAwareness.
Prefer null over stretched scoring. Do not invent growth or self-awareness scores from silence.
`;
