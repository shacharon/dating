/**
 * Expansion-10 promotion-ready metadata + LLM semantic prompt blocks (shadow until promote).
 * LLM-first only — no keyword heuristics.
 */

export const EXPANSION_10_SHADOW_SIGNAL_KEYS = [
  'repairSkills',
  'forgivenessStyle',
] as const;

export type Expansion10ShadowSignalKey =
  (typeof EXPANSION_10_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_10_PROMOTION_WEIGHTS: Record<
  Expansion10ShadowSignalKey,
  number
> = {
  repairSkills: 1.4,
  forgivenessStyle: 1.3,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_10_PROMOTION_TIERS: Record<
  Expansion10ShadowSignalKey,
  1 | 2 | 3
> = {
  repairSkills: 2,
  forgivenessStyle: 2,
};

export const EXPANSION_10_PROMOTION_DOMAINS: Record<
  Expansion10ShadowSignalKey,
  string
> = {
  repairSkills: 'communication',
  forgivenessStyle: 'communication',
};

export const EXPANSION_10_PROMOTION_CHIP_LABELS: Record<
  Expansion10ShadowSignalKey,
  string
> = {
  repairSkills: 'Conflict recovery',
  forgivenessStyle: 'Letting go & moving forward',
};

/**
 * Expansion-10 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-10 Conflict Recovery (extract when evidence exists; NOT used for scoring; 1–10 or null):

- repairSkills: ability and willingness to apologize, take ownership of one's part, and actively reconnect
  AFTER conflict, vs stonewalling, deflecting blame, or avoiding resolution.
  1–2 = rarely apologizes; stonewalls / shuts down after conflict; avoids resolution.
  3–4 = struggles to own mistakes; slow to reconnect.
  5–6 = occasionally repairs; inconsistent.
  7–8 = generally apologizes and reconnects after disagreements.
  9–10 = actively repairs — owns their part, apologizes genuinely, reconnects quickly.
  PROTECTED — distinct from:
    conflictStyle (how they behave DURING disagreement — direct/avoidant/escalating — NOT post-conflict apology/ownership/reconnection);
    directness (communication bluntness / transparency — NOT accountability after a fight).
  "I need space after a fight" alone → prefer null unless clearly framed as chronic avoidance of repair
  (healthy temporary cool-down ≠ automatically low repairSkills).
  Prefer null when conflict aftermath / apology / reconnection is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני תמיד מתנצל/ת ראשון/ה, גם אם אני חושב/ת שאני קצת צודק/ת".

- forgivenessStyle: tendency to let go of resentment and move forward vs holding grudges and rehashing past issues.
  1–2 = holds grudges a long time; rehashes old conflicts.
  3–4 = slow to forgive; issues linger.
  5–6 = forgives eventually with effort.
  7–8 = forgives fairly quickly; doesn't dwell.
  9–10 = lets go easily; genuinely moves forward without resentment.
  PROTECTED — distinct from:
    attachmentSecurity (general relational closeness/security — NOT specifically how grudges are handled post-conflict);
    emotionalRegulation (managing emotional reactivity IN THE MOMENT under stress — NOT resolution/letting-go over time after the moment).
  Prefer null when grudges / forgiveness / moving on from conflict are unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני לא שומר/ת טינה - ברגע שדיברנו, זה נגמר".

Prefer null over stretched scoring for all Expansion-10 keys.
`;

/**
 * Expansion-10 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-10 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- repairSkills: desired partner ability/willingness to apologize, own their part, and reconnect AFTER conflict
- forgivenessStyle: desired partner tendency to let go of resentment vs hold grudges / rehash

Use the same 1–10 scales and PROTECTED distinctions as Expansion-10 self definitions.
CRITICAL: partner conflictStyle = DURING-disagreement behavior — NOT post-conflict repair (→ repairSkills).
CRITICAL: partner emotional openness / attachment language alone does NOT equal forgivenessStyle.
CRITICAL: partner "calm under stress" alone → emotionalRegulation territory if present elsewhere — NOT forgivenessStyle.
Prefer null over stretched scoring. Do not invent low repair/forgiveness from silence.
`;
