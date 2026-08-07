/**
 * Expansion-11 promotion-ready metadata + LLM semantic prompt blocks (shadow until promote).
 * LLM-first only — no keyword heuristics.
 */

export const EXPANSION_11_SHADOW_SIGNAL_KEYS = [
  'stressResponse',
  'jealousySecurity',
] as const;

export type Expansion11ShadowSignalKey =
  (typeof EXPANSION_11_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_11_PROMOTION_WEIGHTS: Record<
  Expansion11ShadowSignalKey,
  number
> = {
  stressResponse: 1.3,
  jealousySecurity: 1.4,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_11_PROMOTION_TIERS: Record<
  Expansion11ShadowSignalKey,
  1 | 2 | 3
> = {
  stressResponse: 2,
  jealousySecurity: 1,
};

export const EXPANSION_11_PROMOTION_DOMAINS: Record<
  Expansion11ShadowSignalKey,
  string
> = {
  stressResponse: 'emotional',
  jealousySecurity: 'emotional',
};

export const EXPANSION_11_PROMOTION_CHIP_LABELS: Record<
  Expansion11ShadowSignalKey,
  string
> = {
  stressResponse: 'Support under pressure',
  jealousySecurity: 'Trust & security',
};

/**
 * Expansion-11 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-11 Stress & Security (extract when evidence exists; NOT used for scoring; 1–10 or null):

- stressResponse: behavioral DIRECTION under stress — withdrawing / handling alone (LOW)
  vs actively seeking closeness / support from partner (HIGH).
  This is a COMPATIBILITY AXIS — neither end is "better" or "healthier" by itself.
  1–2 = strongly self-reliant; withdraws and processes alone under stress.
  3–4 = prefers some space before reconnecting when stressed.
  5–6 = mixed; depends on situation.
  7–8 = prefers to talk it out with partner fairly soon when stressed.
  9–10 = actively seeks closeness and reassurance from partner when stressed.
  PROTECTED — distinct from:
    attachmentSecurity (general closeness/fusion pattern — NOT specifically pursue/withdraw under pressure);
    emotionalRegulation (reactivity / volatility / calm recovery IN THE MOMENT — NOT pursue vs withdraw direction);
    repairSkills (post-conflict apology/ownership/reconnection — NOT general stress-time support-seeking).
  Prefer null when stress-time pursue/withdraw behavior is unmentioned.
  Hebrew meaning examples (do not keyword-match): "כשאני לחוץ אני צריך שבן/בת הזוג יהיה קרוב אליי".

- jealousySecurity: tendency toward jealousy and possessiveness vs trust and security
  regarding partner's other relationships / attention.
  CRITICAL POLARITY — HIGH = MORE jealous/possessive; LOW = secure/trusting.
  1–2 = very secure, trusting, comfortable with partner's independence and friendships.
  3–4 = generally secure with occasional insecurity.
  5–6 = some jealousy in specific situations.
  7–8 = regularly feels jealous or needs reassurance.
  9–10 = highly jealous/possessive; struggles with partner's independence.
  PROTECTED — distinct from:
    independence (need for autonomy/space in general — NOT trust/jealousy/possessiveness);
    attachmentSecurity (broader closeness/distance comfort — NOT specifically jealousy about partner's other attention).
  Prefer null when jealousy / trust / possessiveness is unmentioned.
  Do not invent high jealousy from silence or from "I value independence" alone.
  Hebrew meaning examples (do not keyword-match): "אני מתקנא בקלות וצריך לדעת איפה את".

Prefer null over stretched scoring for all Expansion-11 keys.
`;

/**
 * Expansion-11 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-11 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- stressResponse: desired partner direction under stress (withdraw/self-reliant LOW ↔ seek closeness HIGH)
- jealousySecurity: desired partner jealousy/possessiveness vs trust
  (HIGH = more jealous — CRITICAL: do not invert; wanting a "secure/trusting" partner → LOW)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-11 self definitions.
CRITICAL: partner "calm under stress" alone → emotionalRegulation territory — NOT stressResponse
  unless pursue/withdraw / support-seeking direction is explicit.
CRITICAL: partner independence / autonomy preference alone does NOT equal jealousySecurity.
CRITICAL: partner attachment/closeness language alone does NOT equal stressResponse or jealousySecurity.
Prefer null over stretched scoring. Do not invent jealousy or stress direction from silence.
`;
