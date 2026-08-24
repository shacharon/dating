/**
 * Expansion-02 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 */
export const EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-02 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- emotionalRegulation: managing emotions under stress; staying balanced vs reactive/volatile;
  not flooding a partner with emotional outbursts; ability to calm down and process feelings.
  1–2 = very reactive, volatile, struggles to calm down when upset.
  3–4 = sometimes reactive, needs time to recover from strong emotions.
  5–6 = generally balanced, can usually manage reactions with effort.
  7–8 = emotionally steady, processes feelings without derailing the relationship.
  9–10 = highly regulated, calm under pressure, rarely reactive.
  PROTECTED — distinct from:
    emotionalDepth (values depth/introspection, not self-regulation under stress);
    empathyCompassion (attunement to partner feelings, not own emotional control);
    conflictStyle (how disagreements are handled, not general emotional steadiness);
    attachmentSecurity (bonding/clinginess style, not regulation skill);
    vulnerabilityOpenness (comfort sharing vs ability to stay calm).
  Infer from HOW they describe emotional reactions, stress, and recovery — semantic meaning, not keywords.
  Prefer null over stretched scoring.

- physicalAffectionStyle: need for physical touch, cuddling, PDA, closeness through touch in a relationship;
  how much physical affection they want to give and receive day-to-day.
  1–2 = low touch needs, prefers minimal physical affection.
  3–4 = occasional affection, not a primary love language.
  5–6 = moderate touch needs, enjoys regular affection.
  7–8 = high affection needs, touch is important for feeling connected.
  9–10 = very high touch needs, physical closeness is essential daily.
  PROTECTED — distinct from:
    physicalPriority (importance of partner's looks/attractiveness, not touch frequency);
    attachmentSecurity (emotional closeness/fusion, not tactile affection style);
    emotionalAvailability (behavioral presence "am I there?" — shadow, not extracted here);
    independence (autonomy/space vs need for physical closeness).
  Infer from explicit statements about touch, cuddling, PDA, physical closeness — not keywords.
  Prefer null over stretched scoring.
`;
