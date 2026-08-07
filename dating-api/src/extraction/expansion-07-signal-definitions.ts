/**
 * Expansion-07 promotion-ready metadata (shadow until promote) + LLM semantic blocks.
 * LLM-first only — no keyword lists for scoring.
 */

export const EXPANSION_07_SHADOW_SIGNAL_KEYS = [
  'casualIntimacyIntent',
  'supportExchangeOrientation',
  'supportProviderOrientation',
  'supportRecipientOrientation',
  'religiousObservance',
] as const;

export type Expansion07ShadowSignalKey =
  (typeof EXPANSION_07_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_07_PROMOTION_WEIGHTS: Record<
  Expansion07ShadowSignalKey,
  number
> = {
  casualIntimacyIntent: 1.4,
  supportExchangeOrientation: 1.5,
  supportProviderOrientation: 1.3,
  supportRecipientOrientation: 1.3,
  religiousObservance: 1.5,
};

export const EXPANSION_07_PROMOTION_DOMAINS: Record<
  Expansion07ShadowSignalKey,
  string
> = {
  casualIntimacyIntent: 'intimacy',
  supportExchangeOrientation: 'relationship',
  supportProviderOrientation: 'relationship',
  supportRecipientOrientation: 'relationship',
  religiousObservance: 'values',
};

/** Standalone positive chip labels (provider/recipient use pair-level chips in Story 4). */
export const EXPANSION_07_PROMOTION_CHIP_LABELS: Partial<
  Record<Expansion07ShadowSignalKey, string>
> = {
  casualIntimacyIntent: 'Intimacy expectations',
  supportExchangeOrientation: 'Support & arrangement style',
  religiousObservance: 'Religious practice',
};

/**
 * Expansion-07 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-07 Profile Gap (extract when evidence exists; NOT used for scoring; 1–10 or null):

- casualIntimacyIntent: comfort with casual physical intimacy (hookups / sex without commitment)
  vs intimacy only within committed/emotional relationship.
  1–2 = committed-only intimacy; rejects casual/hookups.
  3–4 = strong preference for emotional connection before physical; casual unlikely.
  5–6 = open either way depending on connection; no strong stance.
  7–8 = comfortable with casual physical intimacy; may prefer low-commitment.
  9–10 = explicitly seeks hookups/casual sex; rejects relationship commitment for intimacy.
  PROTECTED — distinct from:
    physicalPriority (importance of looks/attraction — not casual vs committed intimacy boundary);
    relationshipClarity (labels/exclusivity/commitment structure — not specifically physical/intimate boundary);
    physicalAffectionStyle (touch/cuddling/PDA needs — not hookup vs committed-only boundary).
  Infer from semantic stance on casual sex / hookups / "no strings" vs intimacy-needs-commitment —
  not keyword lists. Prefer null if dating goals omit physical/intimate boundaries.

- supportExchangeOrientation: openness to transactional / arrangement / money-in-relationship dynamics
  (allowance, sugar dating, explicit support-for-companionship) vs purely romantic/non-transactional.
  1–2 = explicitly rejects transactional/arrangement dynamics.
  3–4 = uncomfortable with money/support as part of dating.
  5–6 = neutral / no clear stance.
  7–8 = open to mutual or one-sided support as part of relationship.
  9–10 = explicitly seeks arrangement (allowance, financial support, sugar dynamic).
  PROTECTED — distinct from:
    financialMindset (save/spend/security philosophy — not arrangement dynamics);
    emotional "support" / תמיכה through hard times without money context (do NOT score high — prefer null/low).
  Prefer null when "support each other" is emotional-only.

- supportProviderOrientation: desire to GIVE ongoing financial support to a partner
  (breadwinner / allowance / "I take care of you financially").
  1–2 = does not want to provide; expects equal split.
  3–4 = occasional generosity (dates/gifts) but not ongoing support — generosity alone stays low–mid, not 9–10.
  5–6 = open to contributing more in committed relationship; no explicit provider role.
  7–8 = wants to be primary provider / breadwinner.
  9–10 = explicitly offers allowance or ongoing financial support ("I'll give you $X/month").
  PROTECTED — distinct from supportExchangeOrientation (openness vs direction) and supportRecipientOrientation (give ≠ receive).

- supportRecipientOrientation: desire to RECEIVE ongoing financial support from a partner.
  1–2 = does not want financial support; values independence.
  3–4 = accepts occasional treats but not ongoing support.
  5–6 = neutral; would accept support in committed relationship if offered.
  7–8 = prefers/expects partner to contribute more financially.
  9–10 = explicitly seeks allowance / ongoing support ("looking for someone who supports me").
  PROTECTED — distinct from exchange openness and provider direction.
  Disambiguation: Profile offering "$1000/month support" → high exchange + high provider + low recipient.
  Emotional תמיכה without money → null/low on provider/recipient.

- religiousObservance: practical religious practice (kosher, Shabbat, prayer, community, ritual)
  vs secular / cultural-only / non-practicing.
  1–2 = secular; no religious practice.
  3–4 = cultural identity only; minimal practice.
  5–6 = moderate practice; some rituals matter.
  7–8 = regular observance (kosher, Shabbat, prayer, community).
  9–10 = strict observance; practice central to daily life / partner requirements.
  PROTECTED — distinct from:
    spirituality (inner/transcendent meaning — "spiritual but not observant" can be high spirituality + low observance);
    traditionalism (life-structure / marriage-kids values — not ritual practice level).
  Prefer null when no religious/practice cues exist.

Prefer null over stretched scoring for all Expansion-07 keys.
`;

/**
 * Expansion-07 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-07 Profile Gap for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- casualIntimacyIntent: desired partner's casual vs committed-only intimacy stance
- supportExchangeOrientation: openness they want around arrangement/money-in-relationship
- supportProviderOrientation: whether they want a partner who PROVIDES financial support
- supportRecipientOrientation: whether they want a partner who RECEIVES / expects financial support
- religiousObservance: desired partner's practical religious practice level

Use the same 1–10 scales and PROTECTED distinctions as Expansion-07 self definitions.
CRITICAL: partner traditionalism = marriage/kids/family-structure preference — NOT ritual observance
  (kosher/Shabbat/דתי practice → religiousObservance when about practice level).
CRITICAL: partner physicalPriority = looks/attraction importance — NOT casual-intimacy boundary.
Emotional תמיכה without financial context → do not score support* high.
Prefer null over stretched scoring.
`;
