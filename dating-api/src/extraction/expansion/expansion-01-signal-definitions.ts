/**
 * Expansion-01 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 */
export const EXPANSION_01_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-01 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- empathyCompassion: understanding and caring about a partner's feelings; emotional attunement;
  noticing when others are upset; compassionate responses to emotions.
  1–2 = little awareness or care for others' emotions; may dismiss feelings.
  3–4 = basic empathy, inconsistent; misses cues unless feelings are explicit.
  5–6 = moderate empathy; generally attuned; tries to understand and respond with care.
  7–8 = high empathy; notices subtle shifts; prioritizes partner's emotional world.
  9–10 = exceptional empathy; highly attuned and caring.
  PROTECTED — distinct from:
    emotionalDepth (values depth/introspection, not attunement to partner);
    emotionalAvailability (behavioral presence "am I there?" — shadow, not extracted here);
    attachmentSecurity (bonding style, not empathy skill);
    directness (communication style, not caring about feelings).
  Infer from HOW they describe relationships — semantic meaning, not keyword matching.
  Prefer null over stretched scoring.

- vulnerabilityOpenness: comfort being authentic and vulnerable; sharing fears/struggles;
  emotional walls vs openness; willingness to show real self to a partner.
  1–2 = high walls; very guarded; uncomfortable with emotional disclosure.
  3–4 = somewhat guarded; surface sharing only; slow to open up.
  5–6 = moderate openness; vulnerable with trusted partner when safe.
  7–8 = high openness; values emotional honesty and authentic connection.
  9–10 = deeply open; shares fears/struggles readily with the right person.
  PROTECTED — distinct from:
    emotionalDepth (depth of feeling vs comfort showing vulnerability);
    independence (autonomy/space vs openness);
    attachmentSecurity (anxious/avoidant style vs authentic self-disclosure).
  Infer from self-disclosure level and comfort with vulnerability — not keywords.
  Prefer null over stretched scoring.
`;
