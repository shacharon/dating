import { createHash } from 'node:crypto';
import type { ExtractionDomain } from './extracted-signals.interface';

/**
 * V2 Base Signal Extractor Prompts - NO INTERESTS SECTION
 * Only psychological signals extraction.
 */

const SELF_BASE_SIGNALS_PROMPT_V2 = `You are a professional psychological profiler. Extract two parallel outputs for domain: self:
1) psychological signals
2) rawInterests

STRICT RULE:
ONLY extract from EXPLICIT evidence in the text.
NO inference. NO guessing.
If evidence is weak, vague, generic, or only loosely related, return null.

RAW INTERESTS RULES (rawInterests):
- always include "rawInterests": [] in output
- fill when explicit or strongly implied interests/topics/lifestyle preferences exist
- lowercase, 1-3 words, no punctuation
- max 10 items
- no guessing

SPARSITY SHUTDOWN:
If input is shorter than 15 words OR contains no concrete self-descriptive, behavioral, or relational statements:
- set all signals to null
- set confidence to 0.1
- evidence = []

SPARSITY REFINEMENT:
Do NOT apply full-null output if the text contains even one clear behavioral, relational, or rule-based statement.
In that case, extract only the clearly supported signals and leave the rest null.

GENERIC TEXT EXAMPLES:
- "I'm a nice guy"
- "Looking for love"
- "I want something real"
- "Kind, loyal, funny"

CONCRETE TEXT EXAMPLES:
- habits, routines, boundaries, emotional patterns, social preferences, conflict behavior, explicit relationship principles

RAW INTERESTS (rawInterests):
- Extract concrete interests/topics/lifestyle preferences from text.
- Only explicit or strongly implied items.
- No guessing.
- Each item must be short (1-3 words), lowercase, no punctuation.
- Max 10 items; prefer 5-8 high-quality.

ALLOWED KEYS:
emotionalDepth, attachmentSecurity, directness, independence, socialBattery, lifestylePace, ambition, healthBodyConsciousness, spirituality, intellectualCuriosity, conflictStyle, noveltyVsRoutine, structureChaosTolerance

RELATIONSHIP-AS-SELF RULE:
If the text states relationship principles as personal needs, values, or rules, treat them as self-description.

LITERAL PRIORITY RULE:
When explicit relational or behavioral phrases appear, prioritize them over weaker generic cues elsewhere in the text.

EVIDENCE RULES:
- Every non-null signal must have:
  - exact quote
  - short reason (max 8 words)
- No paraphrasing in quote
- If no exact quote exists, set null

SIGNAL RULES:
- emotionalDepth = explicit introspection, vulnerability, emotional self-awareness
- attachmentSecurity = explicit closeness, fusion, anchor-like bond, inseparable emotional union
- directness = explicit transparency, no secrets, clear communication
- independence = explicit autonomy vs fusion; shared-everything / merged-life language = low
- socialBattery = explicit social-energy preference only
- lifestylePace = explicit pace/rhythm (calm vs high-action)
- ambition = explicit goals, drive
- healthBodyConsciousness = explicit health/fitness focus
- spirituality = explicit spiritual/religious orientation
- intellectualCuriosity = explicit learning/ideas
- conflictStyle = explicit disagreement handling, repair, de-escalation
- noveltyVsRoutine = explicit novelty vs routine preference
- structureChaosTolerance = explicit order vs chaos preference

HARD SEMANTIC GUARD:
Do NOT map generic personality or value language to deep traits.
Reject signals derived only from:
- adjectives (kind, sincere, mature)
- vague emotional tone
- job or logistics
Only accept signals tied to clear behavior, pattern, preference, or personal rule.

LOGISTICS GUARD:
Do NOT derive signals from work, travel, or schedule unless explicit personal preference is stated.

VAGUE SELF-DESCRIPTION GUARD:
Do NOT derive signals from vague self-labels unless tied to clear behavior or pattern.

MULTI-MAPPING:
One quote -> one primary signal unless clearly split into distinct clauses.

STRICT EXCLUSIONS:
Do not output keys outside the allowlist.
Do not output relationshipClarity.
Do not output traditionalism.

SCORING:
- Default anchor = 5
- Use 4-7 for moderate clear evidence
- Use 1-2 or 9-10 only for explicit extreme wording
- Prefer null over stretched scoring

CONFIDENCE:
- sparse text -> 0.1
- fewer than 2 non-null signals -> <= 0.3
- high confidence only for literal, unambiguous evidence

FINAL OVERRIDE RULES (HIGHEST PRIORITY):
1. A signal is valid ONLY if the quote directly expresses that signal.
2. If the text contains a clear relational or behavioral rule, extract it even if the text is otherwise sparse.
3. Do NOT suppress strong literal signals because of sparsity.
4. Fusion / merger language should be treated as valid self evidence.
5. Transparency / no-secrets language should be treated as valid self evidence.
6. Shared-everything / merged-life language should be treated as valid self evidence.

Output JSON (rawInterests is required, even if empty):
{ "domain": "self", "signals": { "key": int|null }, "rawInterests": [], "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

const RELATIONSHIP_BASE_SIGNALS_PROMPT_V2 = `You are a professional psychological profiler. Extract two parallel outputs for domain: relationship:
1) psychological signals
2) rawInterests

STRICT RULE:
ONLY extract from EXPLICIT evidence in the text.
NO inference. NO guessing.
If evidence is weak, vague, generic, or only loosely related, return null.

RAW INTERESTS RULES (rawInterests):
- always include "rawInterests": [] in output
- fill when explicit or strongly implied interests/topics/lifestyle preferences exist
- lowercase, 1-3 words, no punctuation
- max 10 items
- no guessing

SPARSITY SHUTDOWN:
If input is shorter than 15 words AND contains no concrete relationship-structure statements:
- set all signals to null
- set confidence to 0.1
- evidence = []

GENERIC TEXT EXAMPLES:
- "I want love"
- "A real relationship"
- "Someone loyal"
- "Good vibes only"

CONCRETE TEXT EXAMPLES:
- boundaries, commitment rules, exclusivity, repair style, communication norms, family goals, home-life expectations

RAW INTERESTS (rawInterests):
- Extract concrete interests/topics/lifestyle preferences from text.
- Only explicit or strongly implied items.
- No guessing.
- Each item must be short (1-3 words), lowercase, no punctuation.
- Max 10 items; prefer 5-8 high-quality.

ALLOWED KEYS:
emotionalDepth, attachmentSecurity, relationshipClarity, traditionalism, spirituality, lifestylePace, socialBattery

CONTRACT RULE:
Only extract when the text describes how the relationship should function.
If the text is only romantic vibe with no structure, return nulls.

RELATIONSHIP RECALL OVERRIDE:
If the text clearly describes bond, family intent, or shared lifestyle,
extract supported signals even if phrased as partner preference.

EVIDENCE RULES:
- Every non-null signal must have:
  - exact quote
  - short reason (max 8 words)
- No paraphrasing in quote
- If no exact quote exists, set null

SIGNAL RULES:
- emotionalDepth = explicit vulnerability, emotional honesty, naming feelings
- attachmentSecurity = explicit closeness, fusion, anchor, inseparable bond
- relationshipClarity = explicit boundaries, labels, transparency, exclusivity, commitment rules
- traditionalism = explicit marriage, kids, religion, family path
- spirituality = explicit spiritual or religious bond
- lifestylePace = quiet/calm/home-centered = lower; adventurous/high-action = higher
- socialBattery = explicit together-social-energy preference only

FAMILY LANGUAGE RULE:
Kids, family, marriage, traditional future -> traditionalism only.
Do NOT map these phrases to relationshipClarity unless the quote is explicitly about rules, labels, boundaries, exclusivity, or transparency.

HARD SEMANTIC GUARD:
Do NOT map generic warmth, sincerity, maturity, or positive character language to deeper traits.
Examples:
- "warm", "nice", "good partner" -> ignore
- "emotional maturity" -> NOT emotionalDepth unless behavior is explicit
- "someone who wants kids" -> traditionalism, NOT relationshipClarity
- "no drama" -> lifestylePace unless explicitly about conflict/repair rules

MULTI-MAPPING:
One quote -> one primary signal unless clearly split into distinct clauses.

STRICT EXCLUSIONS:
Do not output keys outside the allowlist.
Do not invent conflictStyle here.

SCORING:
- Default anchor = 5
- Use 4-7 for moderate clear evidence
- Use 1-2 or 9-10 only for explicit extreme wording
- Prefer null over stretched scoring

CONFIDENCE:
- sparse text -> 0.1
- fewer than 2 non-null signals -> <= 0.3
- high confidence only for literal, unambiguous evidence

Output JSON (rawInterests is required, even if empty):
{ "domain": "relationship", "signals": { "key": int|null }, "rawInterests": [], "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

const PARTNER_BASE_SIGNALS_PROMPT_V2 = `You are a professional psychological profiler. Extract two parallel outputs for domain: partner:
1) psychological signals
2) rawInterests

STRICT RULE:
ONLY extract from EXPLICIT evidence in the text.
NO inference. NO guessing.
If evidence is weak, vague, generic, or only loosely related, return null.

RAW INTERESTS RULES (rawInterests):
- always include "rawInterests": [] in output
- fill when explicit or strongly implied interests/topics/lifestyle preferences exist
- lowercase, 1-3 words, no punctuation
- max 10 items
- no guessing

SPARSITY SHUTDOWN:
If input is shorter than 15 words AND contains no concrete partner-preference statements:
- set all signals to null
- set confidence to 0.1
- evidence = []

GENERIC TEXT EXAMPLES:
- "I want a good person"
- "Someone nice"
- "Kind, loyal, funny"
- "Good values"

CONCRETE TEXT EXAMPLES:
- partner traits tied to behavior, communication, conflict, appearance, learning, family goals, home-life style

RAW INTERESTS (rawInterests):
- Extract concrete interests/topics/lifestyle preferences from text.
- Only explicit or strongly implied items.
- No guessing.
- Each item must be short (1-3 words), lowercase, no punctuation.
- Max 10 items; prefer 5-8 high-quality.

ALLOWED KEYS:
emotionalDepth, relationshipClarity, traditionalism, lifestylePace, socialBattery, physicalPriority, intellectualCuriosity, conflictStyle

EVIDENCE RULES:
- Every non-null signal must have:
  - exact quote
  - short reason (max 8 words)
- No paraphrasing in quote
- If no exact quote exists, set null

STRUCTURE OVERRIDE:
If the text defines any rule, boundary, expectation, or relational dynamic,
you MUST extract the relevant signal.

Do NOT nullify structured relationship descriptions due to sparsity.

SIGNAL RULES:
- emotionalDepth = explicit vulnerability, emotional openness, naming feelings
- relationshipClarity = explicit desire for boundaries, labels, exclusivity, transparency, commitment rules
- traditionalism = explicit desire for kids, marriage, religion, traditional family
- lifestylePace = quiet/calm/home-centered = lower; adventurous/high-action = higher
- socialBattery = explicit social-energy cues only
- physicalPriority = explicit looks, attraction, chemistry, appearance
- intellectualCuriosity = explicit learning, books, ideas, curiosity, deep conversations
- conflictStyle = explicit disagreement handling, repair, calm discussion, de-escalation

DIRECTION LOCK:
For lifestylePace:
- calm, quiet, slow, peaceful, home-centered, low-drama -> LOWER scores
- busy, packed, fast, adventurous, high-energy -> HIGHER scores
Never reverse this direction.

FAMILY LANGUAGE RULE:
Kids, family, marriage, traditional future -> traditionalism only.
Do NOT map these phrases to relationshipClarity unless the quote is explicitly about rules, labels, boundaries, exclusivity, or transparency.

PHYSICAL GUARD:
Do NOT infer physicalPriority from warmth, stability, emotional language, or family language.

HARD SEMANTIC GUARD:
Do NOT map generic warmth, sincerity, maturity, or positive character language to deeper traits.
Examples:
- "kind", "nice", "mature" -> ignore
- "growth", "accountability" -> NOT emotionalDepth
- "quiet home" -> lifestylePace only
- "no drama" -> conflictStyle only if explicit conflict behavior
- "open to kids later" -> traditionalism, NOT relationshipClarity

MULTI-MAPPING:
One quote -> one primary signal unless clearly split into distinct clauses.

STRICT EXCLUSIONS:
Do not output independence.
Do not output attachmentSecurity.
Do not invent signals outside the allowlist.

SCORING:
- Default anchor = 5
- Use 4-7 for moderate clear evidence
- Use 1-2 or 9-10 only for explicit extreme wording
- Prefer null over stretched scoring

CONFIDENCE:
- sparse text -> 0.1
- fewer than 2 non-null signals -> <= 0.3
- high confidence only for literal, unambiguous evidence

Output JSON (rawInterests is required, even if empty):
{ "domain": "partner", "signals": { "key": int|null }, "rawInterests": [], "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

export function getBaseSignalsPromptV2(domain: ExtractionDomain): string {
  switch (domain) {
    case 'self':
      return SELF_BASE_SIGNALS_PROMPT_V2;
    case 'relationship':
      return RELATIONSHIP_BASE_SIGNALS_PROMPT_V2;
    case 'partner':
      return PARTNER_BASE_SIGNALS_PROMPT_V2;
  }
}

/** Hash of V2 base signals prompt for versioning. */
export const BASE_SIGNALS_PROMPT_HASH_V2 = createHash('sha256')
  .update(SELF_BASE_SIGNALS_PROMPT_V2)
  .digest('hex')
  .slice(0, 12);

export const INTERESTS_PROMPT_HASH = 'interests_v1'; // placeholder, from InterestsExtractionService
export const NEGATIVES_PROMPT_HASH = 'negatives_v1'; // placeholder, from NegativesExtractionService
export const RAW_INTERESTS_PROMPT_HASH = 'raw_interests_v1';
export const RAW_NEGATIVES_PREFS_PROMPT_HASH = 'raw_negatives_prefs_v1';

export function getRawInterestsPromptV2(domain: ExtractionDomain): string {
  return `You extract interests for domain: ${domain}.

Task:
- Return only concrete interests/topics/lifestyle preferences from the given text.
- Include only explicit or strongly implied items.
- No guessing.

Formatting rules:
- output key must be exactly "rawInterests"
- each item lowercase
- each item 1-3 words
- no punctuation
- max 10 items

Output JSON only:
{ "rawInterests": [] }`;
}

export function getRawNegativePreferencesPromptV2(domain: ExtractionDomain): string {
  return `You extract boundaries and negative preferences for domain: ${domain}.

Task:
- Return explicit or strongly implied boundaries/preferences only.
- No guessing.

Output keys:
- negativePreferences
- softNo
- dealbreakers

Rules:
- lowercase
- short normalized items (1-3 words)
- no punctuation
- max 10 items per key

Examples:
- "no smokers" -> dealbreakers or negativePreferences
- "no drama" -> softNo
- "not controlling" -> negativePreferences
- "doesnt want kids soon" -> dealbreakers if explicit

Output JSON only:
{
  "negativePreferences": [],
  "softNo": [],
  "dealbreakers": []
}`;
}
