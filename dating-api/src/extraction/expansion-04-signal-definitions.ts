/**
 * Expansion-04 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 * intellectualCuriosity already existed as a thin shadow key — this block refines
 * relationship-need framing. creativeExpression is new this sprint.
 */
export const EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-04 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- intellectualCuriosity: need for mental stimulation with a partner — ideas, learning,
  deep conversations, intellectual growth in a relationship.
  NOT merely "I am smart / educated / read a lot" as self-image — rate need for stimulation in love.
  1–2 = little interest in ideas or deep thinking with a partner.
  3–4 = occasional intellectual conversation is fine.
  5–6 = moderate — enjoys some mental stimulation.
  7–8 = needs regular intellectual engagement; ideas matter in the bond.
  9–10 = intellectual connection is essential; thrives on learning together.
  PROTECTED — distinct from:
    emotionalDepth (introspection / emotional intensity, not idea-oriented stimulation);
    adventureNovelty (novelty vs familiar routines, not intellectual depth);
    humorPlayfulness (levity / banter, not mental stimulation);
    ambition (goals / drive / achievement, not curiosity about ideas);
    conflictStyle (disagreement handling, not intellectual engagement);
    interest tags / hobby mentions (binary hobby presence ≠ scored intellectual need).
  Infer from what they want to share/discuss/grow with a partner — semantic meaning, not keywords "smart" or "books".
  Distinguish "I am intelligent" (self-image) vs "I need mental stimulation in relationships" (relationship need).
  Prefer null over stretched scoring.

- creativeExpression: need for creative outlets — art, making things, self-expression through creation;
  how central creativity is to identity and daily life.
  NOT merely having a creative job title or listing an art hobby tag — rate need/identity drive for creating.
  1–2 = not interested in creative pursuits.
  3–4 = enjoys creativity casually.
  5–6 = creative hobbies matter moderately.
  7–8 = creative expression is an important part of life.
  9–10 = creativity is core identity; needs space and respect for creative time.
  PROTECTED — distinct from:
    intellectualCuriosity (mental stimulation / ideas, not making/creating);
    adventureNovelty (seeking new experiences, not creative making);
    humorPlayfulness (play/banter, not artistic expression);
    lifestylePace (busy vs calm rhythm, not creative identity);
    interest tags (e.g. art_visual / music — presence of a hobby ≠ intensity of creative need);
    job/logistics ("I'm a designer") alone without need/identity cues.
  Infer from how central making/creating is to who they are and what they need — not keyword "artist" or "creative".
  Distinguish "I work in design" (job) vs "I need creative expression in my life" (identity/need).
  Prefer null over stretched scoring.
`;
