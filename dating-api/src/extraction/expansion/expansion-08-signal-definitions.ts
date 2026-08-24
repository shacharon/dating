/**
 * Expansion-08 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */

export const EXPANSION_08_SHADOW_SIGNAL_KEYS = [
  'educationLevel',
  'honestyIntegrity',
  'chronotype',
  'physicalTypePreference',
] as const;

export type Expansion08ShadowSignalKey =
  (typeof EXPANSION_08_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_08_PROMOTION_WEIGHTS: Record<
  Expansion08ShadowSignalKey,
  number
> = {
  educationLevel: 1.3,
  honestyIntegrity: 1.4,
  chronotype: 1.1,
  physicalTypePreference: 1.2,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_08_PROMOTION_TIERS: Record<
  Expansion08ShadowSignalKey,
  1 | 2 | 3
> = {
  educationLevel: 1,
  honestyIntegrity: 1,
  chronotype: 3,
  physicalTypePreference: 3,
};

export const EXPANSION_08_PROMOTION_DOMAINS: Record<
  Expansion08ShadowSignalKey,
  string
> = {
  educationLevel: 'values',
  honestyIntegrity: 'values',
  chronotype: 'lifestyle',
  physicalTypePreference: 'lifestyle',
};

export const EXPANSION_08_PROMOTION_CHIP_LABELS: Record<
  Expansion08ShadowSignalKey,
  string
> = {
  educationLevel: 'Education alignment',
  honestyIntegrity: 'Honesty & integrity',
  chronotype: 'Sleep & energy rhythm',
  physicalTypePreference: 'Physical type fit',
};

/**
 * Expansion-08 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-08 Education / Integrity / Lifestyle (extract when evidence exists; NOT used for scoring; 1–10 or null):

- educationLevel: importance of formal education / degree attainment (high school → university → advanced degree)
  for self and/or partner filtering.
  1–2 = education/credentials do not matter; street smarts over diplomas.
  3–4 = some schooling preferred; not a filter.
  5–6 = appreciates education; open either way.
  7–8 = prefers university-educated partner.
  9–10 = requires degree / advanced degree as partner filter.
  PROTECTED — distinct from:
    intellectualCuriosity (love of learning/ideas/mental stimulation — not formal credentials);
    ambition (drive/goals/achievement — not schooling credential preference).
  "I'm smart" / bookish without degree stance → prefer null (curiosity may fire separately).
  Hebrew meaning examples (do not keyword-match): "רק עם תואר ראשון", "חכמים באוניברסיטה".

- honestyIntegrity: importance of honesty, integrity, trustworthiness, and "no games" as a relationship value.
  1–2 = little emphasis on honesty/integrity (ONLY when text downplays it — do NOT invent low from silence).
  3–4 = mild preference for honesty.
  5–6 = values honesty but not a dominant theme.
  7–8 = strongly seeks honest / straightforward / no-game partner.
  9–10 = honesty/integrity is central ("straight as a ruler", "no liars", "no games").
  PROTECTED — distinct from:
    directness (communication bluntness / transparency style — not integrity/trustworthiness as a core value).
  Prefer null when honesty/trust/games/integrity are unmentioned.
  Hebrew meaning examples (do not keyword-match): "ישרה כמו סרגל", "לא משחק משחקים".

- chronotype: natural sleep/wake and energy rhythm — early bird ↔ night owl.
  1–2 = strong early bird / morning person.
  3–4 = prefers mornings / early nights.
  5–6 = flexible / normal schedule.
  7–8 = prefers late nights / sleeping in.
  9–10 = strong night owl; sleeps late regularly.
  PROTECTED — distinct from:
    lifestylePace (fast/slow life tempo / busy vs calm — not morning vs night sleep rhythm).
  Prefer null when no sleep/schedule rhythm is mentioned.
  Hebrew meaning examples (do not keyword-match): "לישון עד מאוחר בשבת".

- physicalTypePreference: how specific and important particular body/build preferences are
  (curvy, athletic, slim, petite, taller, etc.) vs flexible about type.
  1–2 = explicitly flexible / "doesn't care about appearance" regarding type.
  3–4 = mild preferences, not filters.
  5–6 = some preference mentioned; still open.
  7–8 = clear type preference (e.g. athletic, curvy).
  9–10 = strong exclusive preference ("only X type").
  PROTECTED — distinct from:
    physicalPriority (how much looks/attraction matter — not which body/build type);
    healthBodyConsciousness (own wellness values — not partner body-type filter).
  Mentions "beautiful" / "attractive" without type specificity → prefer null here (physicalPriority may fire).
  Hair-color-only exclusive filters → prefer null or mid; do not invent a hair-color scored signal.
  Race/ethnicity preferences and sexual-anatomy-only preferences → ALWAYS null on this key (and all Exp-08 keys).
  Category labels (athletic/curvy/slim/etc.) are meaning aids only — do NOT invent a second scored key.
  Hebrew meaning examples (do not keyword-match): "אוהב שמנות ומלאות", "לא איכפת לו ממראה חיצוני".

Prefer null over stretched scoring for all Expansion-08 keys.
Ethical: race/ethnicity and sexual-anatomy-only text must not produce Exp-08 scores.
`;

/**
 * Expansion-08 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-08 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- educationLevel: how much formal education/credentials matter in a partner
- honestyIntegrity: desired partner honesty/integrity/"no games" emphasis
- chronotype: desired partner sleep/energy rhythm (early bird vs night owl)
- physicalTypePreference: how specific body/build type preferences are for a partner

Use the same 1–10 scales and PROTECTED distinctions as Expansion-08 self definitions.
CRITICAL: partner intellectualCuriosity = mental stimulation/ideas — NOT degree/credential filter (→ educationLevel).
CRITICAL: partner physicalPriority = looks/attraction importance — NOT which body/build type (→ physicalTypePreference).
CRITICAL: partner traditionalism / lifestylePace remain as today — chronotype is sleep/morning-night only.
Race/ethnicity and sexual-anatomy-only preferences → null on all Expansion-08 keys.
Prefer null over stretched scoring. Do not invent honestyIntegrity low scores from silence.
`;
