/**
 * Expansion-05 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 * Both physicalActivityLevel and domesticComfort are new this sprint.
 */
export const EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-05 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- physicalActivityLevel: how active/athletic in daily life — fitness behavior, energy for
  physical activities, sedentary vs very active lifestyle / athletic identity.
  Rate actual movement and activity behavior, not merely caring about wellness.
  1–2 = sedentary, low physical activity, prefers minimal movement.
  3–4 = light activity, occasional walks or gym.
  5–6 = moderately active, regular exercise.
  7–8 = very active, fitness/sports are a regular part of life.
  9–10 = highly athletic, activity is central to daily identity.
  PROTECTED — distinct from:
    healthBodyConsciousness (wellness values / caring about health — not how much they move);
    physicalPriority (importance of partner's looks/attraction — not own activity level);
    lifestylePace (busy vs calm life rhythm — not athletic/fitness behavior);
    physicalAffectionStyle (touch/affection need — not sports/fitness);
    adventureNovelty (novelty seeking — not exercise habits);
    interest tags (e.g. gym / hiking — hobby presence ≠ scored activity intensity).
  Infer from how much they move and how central physical activity is — semantic meaning, not keyword "gym" or "fit".
  Distinguish "I care about healthy eating" (wellness values) vs "I train hard most days" (activity level).
  Prefer null over stretched scoring.

- domesticComfort: preference for home/cozy time vs being out and about — where they recharge
  and prefer to spend evenings/weekends (high = homebody / nest preference).
  1–2 = restless at home, always wants to be out, rarely enjoys staying in.
  3–4 = leans toward going out; home is mainly for sleep.
  5–6 = balanced mix of home and out.
  7–8 = prefers cozy nights in; home is the comfort zone.
  9–10 = strong homebody; loves domestic comfort; rarely wants to go out.
  PROTECTED — distinct from:
    socialBattery (intro/extro social energy — not home-vs-out preference);
    lifestylePace (calm vs high-action busy rhythm — not nesting vs nightlife preference);
    adventureNovelty (new experiences vs familiar routines — not specifically home nest);
    independence (autonomy vs fusion — not homebody preference);
    interest tags (e.g. home_life / nightlife — tag presence ≠ scored home/out preference).
  Infer from where they prefer to spend free time and recharge — semantic meaning, not keyword "homebody" or "nightlife".
  Distinguish "I'm introverted / low social energy" (socialBattery) vs "I love staying in on weekends" (domesticComfort).
  Distinguish "my life is calm and slow-paced" (lifestylePace) vs "I prefer cozy nights at home vs going out" (domesticComfort).
  Prefer null over stretched scoring.
`;
