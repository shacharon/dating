/**
 * Expansion-12 promotion-ready metadata + LLM semantic prompt blocks (shadow until promote).
 * LLM-first only — no keyword heuristics.
 */

export const EXPANSION_12_SHADOW_SIGNAL_KEYS = [
  'listeningPresence',
  'emotionalExpression',
] as const;

export type Expansion12ShadowSignalKey =
  (typeof EXPANSION_12_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_12_PROMOTION_WEIGHTS: Record<
  Expansion12ShadowSignalKey,
  number
> = {
  listeningPresence: 1.3,
  emotionalExpression: 1.2,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_12_PROMOTION_TIERS: Record<
  Expansion12ShadowSignalKey,
  1 | 2 | 3
> = {
  listeningPresence: 2,
  emotionalExpression: 2,
};

export const EXPANSION_12_PROMOTION_DOMAINS: Record<
  Expansion12ShadowSignalKey,
  string
> = {
  listeningPresence: 'communication',
  emotionalExpression: 'emotional',
};

export const EXPANSION_12_PROMOTION_CHIP_LABELS: Record<
  Expansion12ShadowSignalKey,
  string
> = {
  listeningPresence: 'Quality listening',
  emotionalExpression: 'Expressiveness',
};

/**
 * Expansion-12 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-12 Feeling Heard (extract when evidence exists; NOT used for scoring; 1–10 or null):

- listeningPresence: quality of attention and presence when a partner speaks —
  distracted / interrupting / half-listening (LOW) vs fully engaged, present,
  partner feels heard (HIGH).
  1–2 = easily distracted; interrupts; doesn't retain what partner shares.
  3–4 = listens inconsistently.
  5–6 = generally attentive.
  7–8 = actively listens, asks follow-ups, remembers details.
  9–10 = deeply present; partner consistently feels heard and understood.
  PROTECTED — distinct from:
    empathyCompassion (understanding/caring about feelings — NOT the behavioral act of full attention / not interrupting);
    directness (how they speak / say hard things — NOT how they receive / listen).
  Prefer null when listening/attention behavior is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני תמיד שם את הטלפון בצד כשבן/בת הזוג מדבר/ת אליי".

- emotionalExpression: comfort/tendency to outwardly express feelings, affection,
  and appreciation verbally vs reserved/internal emotional style.
  1–2 = very reserved; rarely says feelings out loud even when felt deeply.
  3–4 = occasional expression, mostly internal (including "love through actions, not words").
  5–6 = moderate, situational expression.
  7–8 = regularly expresses feelings, affection, appreciation verbally.
  9–10 = very expressive; frequently and openly shares feelings and affection.
  PROTECTED — distinct from:
    emotionalDepth (capacity to feel/discuss deep emotion — NOT how outwardly it is shown;
      deep+reserved or shallow+expressive both possible);
    physicalAffectionStyle (physical touch/PDA — NOT verbal/emotional expression /
      words of affirmation / saying feelings out loud).
  Prefer null when expressing-feelings style is unmentioned.
  Do not invent high expression from silence or from emotional depth alone.
  Hebrew meaning examples (do not keyword-match): "אני אומר/ת לבן/בת הזוג שאני אוהב/ת אותם כל הזמן".

Prefer null over stretched scoring for all Expansion-12 keys.
`;

/**
 * Expansion-12 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-12 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- listeningPresence: desired partner attention/presence when listening
  (distracted/interrupting LOW ↔ deeply present / makes them feel heard HIGH)
- emotionalExpression: desired partner outward verbal/emotional expression
  (reserved/actions-not-words LOW ↔ frequently says feelings/affection HIGH)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-12 self definitions.
CRITICAL: partner empathy/caring language alone → empathyCompassion territory — NOT listeningPresence
  unless attention / presence / not-interrupting behavior is explicit.
CRITICAL: partner emotional depth / vulnerability capacity alone does NOT equal emotionalExpression.
CRITICAL: partner physical affection / touch preference alone does NOT equal emotionalExpression.
Prefer null over stretched scoring. Do not invent listening or expression scores from silence.
`;
