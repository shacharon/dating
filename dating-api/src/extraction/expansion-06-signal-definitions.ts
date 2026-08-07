/**
 * Expansion-06 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 * Canonical key: adventureNovelty (formerly noveltyVsRoutine; alias remains).
 */
export const EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-06 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- adventureNovelty: novelty-seeking vs routine preference — excitement for new experiences,
  places, activities vs comfort in familiar patterns.
  "Adventure" does NOT require extreme sports — trying new restaurants, spontaneous trips,
  variety-seeking count when framed as a preference.
  1–2 = strong preference for routine and familiar; dislikes change / novelty.
  3–4 = mostly routine; occasional new things are fine.
  5–6 = balanced — enjoys some novelty, some routine.
  7–8 = seeks new experiences regularly; variety matters.
  9–10 = strong novelty-seeker; thrives on adventure and the unfamiliar.
  PROTECTED — distinct from:
    lifestylePace (fast/slow busy tempo — can be slow-paced but high novelty, or fast but routine-locked);
    domesticComfort (homebody vs always-out — not new-vs-familiar preference);
    socialBattery (intro/extro social energy — not novelty seeking);
    physicalActivityLevel (athletic/movement behavior — not adventure-as-novelty);
    structureChaosTolerance (order/mess/chaos tolerance — adjacent but not experiential novelty);
    intellectualCuriosity (mental stimulation / ideas — not experiential novelty);
    interest tags (e.g. travel / adventure — hobby presence ≠ scored novelty-vs-routine intensity).
  Infer from how they describe weekends, travel, restaurants, habits, and change — semantic meaning,
  not keyword "adventure", "spontaneous", or "routine".
  Distinguish "my life is calm and slow" (lifestylePace) vs "I prefer familiar places and habits" (adventureNovelty low).
  Distinguish "I love staying in" (domesticComfort) vs "I hate doing the same thing twice" (adventureNovelty high).
  Prefer null over stretched scoring.
`;
