/**
 * Expansion-09 interest tag semantic guidance for LLM extraction prompts.
 * LLM-first only — examples illustrate meaning; do not keyword-match.
 * Tags are NOT compatibility signals.
 */

import { INTEREST_CANONICAL_TAGS } from './extracted-interests.interface';

/** Comma-separated SoT list for prompts — never duplicate tag spellings by hand. */
export const INTEREST_CANONICAL_TAGS_PROMPT_LIST =
  INTEREST_CANONICAL_TAGS.join(', ');

/**
 * Expansion-09 interest tag semantic guidance.
 * Inject into domain INTERESTS sections. Examples are meaning aids only.
 */
export const EXPANSION_09_INTEREST_GUIDANCE_BLOCK = `
INTEREST TAG RULES (canonical ids only — NOT scored signals):
- Output interests as lowercase tags from this allowlist only:
  ${INTEREST_CANONICAL_TAGS_PROMPT_LIST}
- Prefer omit / [] when hobby is unclear or not in the allowlist — do not invent tags.
- Multiple tags allowed when clearly present (coexistence OK).
- Distinctions (Expansion-09):
  - biking: cycling / bike rides (road, mountain, casual). ≠ gym (general fitness); ≠ hiking (on foot).
    Meaning examples (do not keyword-match): "I love cycling", "mountain bike weekends", "אופניים".
  - camping: overnight outdoor camping / tenting. ≠ hiking (day walk); ≠ travel (hotels / general trips).
    Meaning examples: "camping trips", "tent under the stars", "קמפינג".
  - nature: nature appreciation / outdoors broadly (parks, forests, wildlife). Prefer hiking/camping/biking when those are specifically stated; add nature when outdoors love is clear beyond a single activity.
    Meaning examples: "love nature / forests / wildlife", "אוהב טבע".
- Map free-text hobbies to the closest canonical id semantically (e.g. "I like nature" → "nature").
- Do not emit Title Case or free-form labels ("Nature", "Running") — only allowlist ids.
`;
