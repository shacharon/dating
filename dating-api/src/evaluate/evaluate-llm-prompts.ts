export const SUMMARY_SYSTEM_PROMPT = `
You receive extracted relationship data: signals (scores 1-10 or null) and evidence (quotes from the profile) for self, partner, and relationship.

Reply with ONLY a single JSON object. No markdown.

Required keys:
- "overallNarrative": short friendly summary, 2–4 sentences.
- "aboutMeInsight": short user-friendly insight focused on about-me orientation.
- "relationshipInsight": short user-friendly insight focused on relationship style.
- "partnerInsight": short user-friendly insight focused on partner preference.
- "missingPrompts": array of 2–4 specific, practical follow-up questions that help improve profile quality.

Rules:
- Keep language warm, human, and concise.
- Do not mention numbers, confidence, uncertainty labels, diagnostics, or model behavior.
- Do not use technical/clinical wording.
- Avoid words/phrases like "individual", "ascertain", "limited information", "insufficient evidence".
- If profile text is sparse, stay supportive and practical (helpful prompts), not diagnostic.
- Ground insights in provided signals/evidence only; do not invent facts.
`;

export const MOTIVATION_SYSTEM_PROMPT = `
You infer the PRIMARY relationship motivation from profile texts.

Input: aboutMe, aboutPartner, aboutRelationship (three text blocks).

Reply with ONLY a single JSON object. No markdown, no explanation.

Required keys:
- "relationshipMotivation": exactly one of: family_builder | emotional_connection | status_power | freedom_independence
- "confidence": number between 0 and 1
- "evidence": array of short quotes from the texts that support the chosen motivation (1-4 quotes)

Rules:
- Choose ONE dominant motivation only.
- family_builder → kids, home, stability, long-term commitment, building a life together
- emotional_connection → intimacy, feelings, deep bond, soulmate, connection
- status_power → power couple, image, status, ambition, social standing
- freedom_independence → autonomy, distance, independence, space, non-traditional
- Use exact or near-exact short quotes from the input as evidence.
- If unclear or mixed signals → choose the best inference and set confidence < 0.6.
`;

export const ATTRACTION_SYSTEM_PROMPT = `
You infer what attracts this person based on how they describe their ideal partner.

Input: aboutMe, aboutPartner (two text blocks). Focus on the "aboutPartner" (ideal partner) description.

Reply with ONLY a single JSON object. No markdown, no explanation.

Required keys:
- "attractionProfile": object with exactly these keys, each a number 0–10:
  - "ambition": how much they are attracted to drive/achievement (0 = not mentioned, 10 = central)
  - "appearance": how much they emphasize looks/physical attraction (0 = not mentioned, 10 = central)
  - "kindness": how much they value warmth/kindness (0 = not mentioned, 10 = central)
  - "status": how much they value image/prestige/elite (0 = not mentioned, 10 = central)
  - "stability": how much they value family/stable home (0 = not mentioned, 10 = central)
- "confidence": number between 0 and 1 (overall confidence in the inference)
- "evidence": array of short quotes from the input that support the scores (optional but helpful)

Mapping hints:
- "successful / high achiever / driven / ambitious" → ambition
- "beautiful / attractive / appearance / looks" → appearance
- "kind / warm / caring / gentle" → kindness
- "image / prestige / elite / status" → status
- "family / stable home / settled / reliable" → stability

If a dimension is not mentioned, use 0. Use 0–10 to reflect strength of emphasis.
`;

export const ATTRACTION_TRAITS_SYSTEM_PROMPT = `
You are a strict feature-extractor. Output JSON only. No prose.

TASK: Given profile text, infer what traits this person is attracted to in a partner.

OUTPUT JSON SCHEMA (exact keys):
{
  "attraction": {
    "ambition": 0-10,
    "statusOrientation": 0-10,
    "physicalPriority": 0-10,
    "kindnessWarmth": 0-10,
    "stabilityReliability": 0-10,
    "independenceAutonomy": 0-10,
    "emotionalDepth": 0-10,
    "traditionalismValues": 0-10,
    "financialPrudence": 0-10
  },
  "confidence": 0-1,
  "evidence": [
    { "dimension": "string", "quote": "string" }
  ]
}

RULES:
- Primary source is aboutPartner. Use aboutMe/aboutRelationship only if aboutPartner is thin.
- Use integers only (no decimals). Always fill every dimension (never null).
- If unclear: set 5 and lower confidence.
- Evidence: 1-4 items, each quote <= 12 words, copied from input text.
- Map hints:
  - "high-achiever / ambition" -> ambition
  - "image / dress code / etiquette" -> statusOrientation
  - "appearance / looks" -> physicalPriority
  - "kind / warm" -> kindnessWarmth
  - "stable / reliable / responsible" -> stabilityReliability
  - "independent / okay with schedule" -> independenceAutonomy
  - "deep / emotionally available" -> emotionalDepth
  - "traditional / values / kosher" -> traditionalismValues
  - "save / invest / not spender" -> financialPrudence
`;

export const DERIVED_CONTEXT_SYSTEM_PROMPT = `
You infer dealbreaker-relevant lifestyle context from profile texts.

Input: aboutMe, aboutPartner, aboutRelationship (three text blocks).

Reply with ONLY a single JSON object. No markdown, no explanation.

Required keys:
- "occupationClass": one of STANDARD | SHIFT_UNPREDICTABLE | TRAVEL_HEAVY | null
- "visibilityNeed": integer 0–10 (how much social visibility / public life the person wants)
- "lifeStage": integer 0–10 (how settled vs early-career the person is)

Optional keys:
- "confidence": number 0–1
- "evidence": array of up to 5 short quotes from the input

occupationClass definitions:
- SHIFT_UNPREDICTABLE: rotating shifts, night shift, on-call, unpredictable schedule, irregular hours
- TRAVEL_HEAVY: frequent travel, road warrior, nomad, flying weekly, constant travel for work
- STANDARD: stable/predictable schedule OR no strong schedule signal in the text
- null: only when all three texts are empty or purely generic with no lifestyle cues

visibilityNeed:
- 0 = very private, low profile, keeps to self
- 10 = highly visible, social, public-facing life
- 5 when unclear

lifeStage:
- 0 = early career, just starting, young professional
- 10 = settled, established, empty nest, second chapter
- 5 when unclear

Rules:
- Use explicit evidence only; do not guess from job title alone without schedule/visibility/life-stage cues.
- Integers only for visibilityNeed and lifeStage.
`;
