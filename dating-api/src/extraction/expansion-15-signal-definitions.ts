/**
 * Expansion-15 promotion-ready metadata + LLM semantic prompt blocks (shadow until promote).
 * LLM-first only — no keyword heuristics.
 */

export const EXPANSION_15_SHADOW_SIGNAL_KEYS = [
  'familyEnmeshment',
  'friendCoupleBalance',
  'aloneTimeNeed',
] as const;

export type Expansion15ShadowSignalKey =
  (typeof EXPANSION_15_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_15_PROMOTION_WEIGHTS: Record<
  Expansion15ShadowSignalKey,
  number
> = {
  familyEnmeshment: 1.2,
  friendCoupleBalance: 1.1,
  aloneTimeNeed: 1.2,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_15_PROMOTION_TIERS: Record<
  Expansion15ShadowSignalKey,
  1 | 2 | 3
> = {
  familyEnmeshment: 2,
  friendCoupleBalance: 3,
  aloneTimeNeed: 2,
};

export const EXPANSION_15_PROMOTION_DOMAINS: Record<
  Expansion15ShadowSignalKey,
  string
> = {
  familyEnmeshment: 'relationship',
  friendCoupleBalance: 'social',
  aloneTimeNeed: 'social',
};

export const EXPANSION_15_PROMOTION_CHIP_LABELS: Record<
  Expansion15ShadowSignalKey,
  string
> = {
  familyEnmeshment: 'Family closeness',
  friendCoupleBalance: 'Friends & couple balance',
  aloneTimeNeed: 'Alone time needs',
};

/**
 * Expansion-15 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_15_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-15 Family & Social Ecosystem (extract when evidence exists; NOT used for scoring; 1–10 or null):

- familyEnmeshment: degree to which family-of-origin is involved in daily decisions and
  boundaries — independent/boundaried vs highly enmeshed.
  1–2 = very independent from family; makes decisions autonomously.
  3–4 = some family closeness, clear boundaries.
  5–6 = moderate involvement.
  7–8 = family heavily involved in decisions/routines.
  9–10 = very enmeshed; family opinion central to most decisions.
  PROTECTED — distinct from:
    traditionalism (general marriage/kids/religion/family-path values — NOT day-to-day
      family-of-origin involvement in decisions/boundaries).
  Prefer null when family involvement/boundaries stance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "המשפחה שלי מאוד מעורבת בחיים שלי".

- friendCoupleBalance: where social time and priority tend to go —
  friends-first vs couple-centric. Neither end is inherently better.
  SCALE POLARITY (do not invert): LOW = friends-first; HIGH = couple-centric.
  1–2 = friends are a huge priority; lots of independent social time.
  3–4 = leans toward friend time.
  5–6 = balanced.
  7–8 = leans couple-centric.
  9–10 = very couple-centric; prioritizes partner time over friend groups.
  PROTECTED — distinct from:
    socialBattery (introversion/extroversion *energy* / how much socializing someone can do —
      NOT *where* social time goes between friends vs partner).
  Prefer null when friend-vs-couple time balance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני אוהב/ת שרוב הזמן הפנוי שלי יהיה עם בן/בת הזוג".

- aloneTimeNeed: need for solo time to recharge — independent of overall social energy.
  1–2 = rarely needs alone time; prefers constant togetherness.
  3–4 = occasional alone time.
  5–6 = moderate need.
  7–8 = regularly needs solo time to recharge.
  9–10 = strong need for significant alone time; recharges primarily solo.
  PROTECTED — distinct from:
    independence (general autonomy across life decisions / fusion vs autonomy —
      NOT specifically the need for solo recharge time);
    socialBattery (social-energy capacity — NOT solo recharge preference alone).
  Prefer null when alone-time / solo-recharge stance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני צריך/ה את המרחב והזמן שלי כדי להיטען מחדש".

Prefer null over stretched scoring for all Expansion-15 keys.
`;

/**
 * Expansion-15 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_15_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-15 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- familyEnmeshment: desired partner family-of-origin involvement / boundary style
  (very independent/boundaried LOW ↔ highly enmeshed HIGH)
- friendCoupleBalance: desired partner friends-vs-couple time balance
  (friends-first LOW ↔ couple-centric HIGH — do not invert)
- aloneTimeNeed: desired partner need for solo recharge time
  (rarely needs alone time / prefers togetherness LOW ↔ strong solo recharge need HIGH)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-15 self definitions.
CRITICAL: partner marriage/kids/traditional family-path language alone → traditionalism — NOT familyEnmeshment
  unless day-to-day family-of-origin involvement/boundaries are explicit.
CRITICAL: partner social-energy / intro-extro language alone → socialBattery — NOT friendCoupleBalance
  unless friends-vs-couple time allocation is explicit.
CRITICAL: partner autonomy / fusion / "own life" decision language alone → independence territory —
  NOT aloneTimeNeed unless solo recharge / alone-time need is explicit
  (partner domain may not emit independence; still prefer null over inventing aloneTimeNeed from autonomy alone).
Prefer null over stretched scoring. Do not invent family, friend/couple, or alone-time scores from silence.
`;
