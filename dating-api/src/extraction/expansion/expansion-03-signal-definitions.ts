/**
 * Expansion-03 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 */
export const EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-03 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- humorPlayfulness: importance of playfulness, banter, fun, lightness, and shared laughter
  in a relationship — how much levity and play matter day-to-day together.
  NOT merely self-description as "funny" or "I have humor" — rate need for playfulness in love.
  1–2 = very serious tone; little room for play or banter in relationships.
  3–4 = occasional humor; playfulness is nice but not important.
  5–6 = moderate — enjoys fun together, balanced with seriousness.
  7–8 = playfulness is important; banter and lightness strengthen the bond.
  9–10 = play and humor are essential; needs a partner who can laugh and be silly together.
  PROTECTED — distinct from:
    conflictStyle (disagreement handling / repair, not levity in daily connection);
    socialBattery (social energy / introversion–extroversion, not playfulness in intimacy);
    adventureNovelty (preference for novelty vs familiar routines, not banter/laughter);
    emotionalDepth (values depth/introspection over lightness, not opposite of humor);
    empathyCompassion (attunement to partner feelings, not shared silliness);
    emotionalRegulation (managing emotions under stress, not fun/levity needs);
    lifestylePace (calm vs high-action rhythm, not humor/play in bonding).
  Infer from tone, self-description, what they value in a partner — semantic meaning, not keywords "fun" or "humor".
  Distinguish "I am funny" (comedic self-image) vs "I need playfulness in relationships" (relationship need).
  Prefer null over stretched scoring.
`;
