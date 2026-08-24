import { createHash } from 'node:crypto';
import type { ExtractionDomain } from '../extracted-signals.interface';
import {
  joinExpansionInterestGuidanceBlocks,
  joinExpansionPartnerShadowBlocks,
  joinExpansionSelfShadowBlocks,
} from '../expansion/expansion-manifest';

const SELF_EXTRACTOR_PROMPT = `You are a professional psychological profiler. Extract signals and interests for domain: self.

STRICT RULE:
Only extract from explicit evidence in the text.
If evidence is weak, vague, generic, or only loosely related, return null.
Do not guess.

SPARSITY SHUTDOWN:
If input is shorter than 15 words OR contains no concrete self-descriptive, behavioral, or relational statements:
- set all signals to null
- set confidence to 0.1
- evidence = []
- still extract explicit interests if present

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

INTERESTS:
- Extract only explicit hobbies/passions into interests: string[] (pipeline maps to rawInterests)
- Do not invent hobbies from vibe or generic personality language
${joinExpansionInterestGuidanceBlocks()}

ALLOWED KEYS:
emotionalDepth, attachmentSecurity, directness, independence, socialBattery, lifestylePace, ambition, healthBodyConsciousness, spirituality, intellectualCuriosity, conflictStyle, adventureNovelty, structureChaosTolerance, empathyCompassion, vulnerabilityOpenness, emotionalRegulation, physicalAffectionStyle, humorPlayfulness, creativeExpression, physicalActivityLevel, domesticComfort, casualIntimacyIntent, supportExchangeOrientation, supportProviderOrientation, supportRecipientOrientation, religiousObservance, educationLevel, honestyIntegrity, chronotype, physicalTypePreference, repairSkills, forgivenessStyle, stressResponse, jealousySecurity, listeningPresence, emotionalExpression, growthMindset, selfAwareness, patienceTolerance, intimacyPacing, monogamyAlignment, familyEnmeshment, friendCoupleBalance, aloneTimeNeed

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
- emotionalDepth = explicit introspection, vulnerability, emotional self-awareness — not how outwardly feelings are verbally expressed (→ emotionalExpression)
- attachmentSecurity = explicit closeness, fusion, anchor-like bond, inseparable emotional union — not specifically how grudges/resentment are handled post-conflict (→ forgivenessStyle), not pursue/withdraw under stress alone (→ stressResponse), and not jealousy/possessiveness alone (→ jealousySecurity)
- directness = explicit transparency, no secrets, clear communication — not honesty/integrity/"no games" as a core relationship value alone, and not post-conflict ownership/apology alone (→ repairSkills), and not how they receive / listen / give attention alone (→ listeningPresence), and not receptivity to feedback / willingness to change alone (→ growthMindset)
- independence = explicit autonomy vs fusion; shared-everything / merged-life language = low — not jealousy/trust/possessiveness alone (→ jealousySecurity), and not specifically the need for solo recharge / alone time alone (→ aloneTimeNeed)
- socialBattery = explicit social-energy preference only — not friends-vs-couple time allocation alone (→ friendCoupleBalance)
- lifestylePace = explicit pace/rhythm (calm vs high-action busy life) — not home-vs-out nesting preference alone, not novelty-vs-routine preference, and not morning vs night sleep chronotype
- ambition = explicit goals, drive — not formal education/credential preference alone
- healthBodyConsciousness = explicit health/wellness values focus (caring about health — not how much they actually exercise/move)
- spirituality = explicit spiritual/inner meaning orientation — not practical ritual observance level alone
- intellectualCuriosity = explicit need for mental stimulation / ideas / deep learning with a partner (not merely "I'm smart" or listing books, and not formal degree/credential filters)
- conflictStyle = explicit disagreement handling DURING conflict (direct / avoidant / escalating / de-escalating in the moment) — not post-conflict apology, ownership, or reconnection alone (→ repairSkills), and not grudge/forgiveness pacing alone (→ forgivenessStyle), and not day-to-day tolerance for quirks/flaws outside fights alone (→ patienceTolerance)
- adventureNovelty = explicit novelty vs routine / new-experiences preference (not life tempo alone, not homebody preference, not travel hobby tag alone)
- structureChaosTolerance = explicit order vs chaos preference
- empathyCompassion = explicit care for partner's feelings, attunement, compassionate responses (not generic kindness) — not listening attention/presence / not-interrupting alone (→ listeningPresence), and not inward self-insight / naming own patterns alone (→ selfAwareness)
- vulnerabilityOpenness = explicit comfort sharing fears/struggles/authentic self (not merely "honest communication") — not willingness to change / take feedback / self-improvement alone (→ growthMindset)
- emotionalRegulation = explicit emotional steadiness vs reactivity under stress; calm recovery in the moment (not merely "I'm emotional") — not letting go of grudges over time after conflict (→ forgivenessStyle), and not pursue vs withdraw / support-seeking direction alone (→ stressResponse), and not knowing/naming own patterns/triggers alone (→ selfAwareness), and not tolerance threshold for partner's imperfections alone (→ patienceTolerance)
- physicalAffectionStyle = explicit touch/cuddling/PDA/closeness needs (not general attractiveness, not casual vs committed intimacy boundary) — not verbal/emotional expression / words-of-affirmation alone (→ emotionalExpression)
- humorPlayfulness = explicit need for banter, silliness, shared laughter, lightness in love (not merely "I'm funny" or generic "fun-loving")
- creativeExpression = explicit need for creative outlets / making / self-expression through creation (not merely job title "artist" or hobby tag)
- physicalActivityLevel = explicit daily athletic/activity behavior / how much they move (not merely wellness values or "I care about fitness")
- domesticComfort = explicit homebody vs always-out preference for evenings/weekends (not social energy intro/extro, not calm vs busy pace alone)
- casualIntimacyIntent = explicit casual vs committed-only physical intimacy stance (not looks priority, not affection/touch needs alone, not commitment-labels alone, not speed-to-closeness / pacing alone → intimacyPacing)
- supportExchangeOrientation = explicit openness to arrangement/money-in-relationship dynamics (not save/spend philosophy, not emotional support alone)
- supportProviderOrientation = explicit desire to give ongoing financial support (not occasional date generosity alone)
- supportRecipientOrientation = explicit desire to receive ongoing financial support (not emotional support alone)
- religiousObservance = explicit practical religious practice level (not inner spirituality alone, not traditional family-structure alone)
- educationLevel = explicit formal education/degree importance or credential filter (not intellectual curiosity alone, not ambition alone)
- honestyIntegrity = explicit honesty/integrity/"no games" value (not communication bluntness/directness alone); prefer null if unmentioned
- chronotype = explicit morning vs night sleep/energy rhythm (not busy vs calm lifestyle pace alone)
- physicalTypePreference = explicit body/build type specificity vs flexibility (not looks-importance alone); race/anatomy-only → null
- repairSkills = explicit post-conflict apology / ownership / reconnection vs stonewalling or avoiding resolution (not during-conflict style alone, not bluntness alone)
- forgivenessStyle = explicit letting-go vs holding grudges / rehashing past issues (not attachment closeness alone, not in-the-moment emotional regulation alone)
- stressResponse = explicit pursue vs withdraw direction under stress (seek closeness/support HIGH ↔ handle alone/withdraw LOW); compatibility axis — not attachment closeness alone, not emotional reactivity alone, not post-conflict repair alone
- jealousySecurity = explicit jealousy/possessiveness vs trust regarding partner's other attention (HIGH = more jealous); not independence/autonomy alone, not general attachment security alone
- listeningPresence = explicit attention/presence when partner speaks (distracted/interrupting LOW ↔ deeply present / partner feels heard HIGH); not empathy/caring alone, not directness/speaking style alone
- emotionalExpression = explicit outward verbal expression of feelings/affection/appreciation (reserved/actions-not-words LOW ↔ frequently says feelings HIGH); not emotional depth alone, not physical touch affection alone
- growthMindset = explicit openness to feedback / willingness to change and learn as a partner (defensive/fixed LOW ↔ seeks feedback and adapts HIGH); not vulnerability/sharing-fears alone, not directness/speaking style alone
- selfAwareness = explicit insight into own patterns/triggers/tendencies (little insight LOW ↔ clearly names patterns/origins HIGH); not in-the-moment emotional regulation alone, not empathy/caring-about-others alone
- patienceTolerance = explicit day-to-day tolerance for partner flaws/quirks/differences (highly critical LOW ↔ very patient/accepting HIGH); not during-conflict fight style alone, not own emotional regulation alone
- intimacyPacing = explicit preferred speed toward emotional/physical closeness (very slow LOW ↔ moves fast HIGH); not casual-vs-committed intimacy type alone
- monogamyAlignment = explicit exclusive-vs-open/poly structure expectation (strict mono LOW ↔ open/poly HIGH — do not invert); not labels/boundaries/dating-approach clarity alone
- familyEnmeshment = explicit family-of-origin involvement in daily decisions/boundaries (very independent LOW ↔ highly enmeshed HIGH); not marriage/kids traditionalism alone
- friendCoupleBalance = explicit friends-first vs couple-centric time allocation (friends-first LOW ↔ couple-centric HIGH — do not invert); not social-energy intro/extro alone
- aloneTimeNeed = explicit need for solo recharge time (rarely needs alone time LOW ↔ strong solo need HIGH); not general independence/autonomy alone, not socialBattery alone

${joinExpansionSelfShadowBlocks()}

HARD SEMANTIC GUARD:
Do NOT map generic personality or value language to deep traits.
Reject signals derived only from:
- adjectives (kind, sincere, mature)
- vague emotional tone
- job or logistics
Only accept signals tied to clear behavior, pattern, preference, or personal rule.
- "nobody's perfect / little habits bother me" / "I take things slow" / "exclusive only" / "poly / open relationship" -> patienceTolerance / intimacyPacing / monogamyAlignment when explicit; do not dump into conflictStyle, casualIntimacyIntent, or relationshipClarity alone
- "family weighs in on decisions" / "friend group is my identity" / "need space to recharge" -> familyEnmeshment / friendCoupleBalance / aloneTimeNeed when explicit; do not dump into traditionalism, socialBattery, or independence alone

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

Output JSON:
{ "domain": "self", "signals": { "key": int|null }, "interests": [], "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

const RELATIONSHIP_EXTRACTOR_PROMPT = `You are a professional psychological profiler. Extract signals and interests for domain: relationship.

STRICT RULE:
Only extract from explicit evidence in the text.
If evidence is weak, vague, generic, or only loosely related, return null.
Do not guess.

SPARSITY SHUTDOWN:
If input is shorter than 15 words AND contains no concrete relationship-structure statements:
- set all signals to null
- set confidence to 0.1
- evidence = []
- still extract explicit interests if present

GENERIC TEXT EXAMPLES:
- "I want love"
- "A real relationship"
- "Someone loyal"
- "Good vibes only"

CONCRETE TEXT EXAMPLES:
- boundaries, commitment rules, exclusivity, repair style, communication norms, family goals, home-life expectations

INTERESTS:
- Extract only explicit shared-bond or lifestyle interests into interests: string[] (pipeline maps to rawInterests)
- Do not invent hobbies from vibe or generic personality language
${joinExpansionInterestGuidanceBlocks()}

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

Output JSON:
{ "domain": "relationship", "signals": { "key": int|null }, "interests": [], "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

const PARTNER_EXTRACTOR_PROMPT = `You are a professional psychological profiler. Extract signals and interests for domain: partner.

STRICT RULE:
Only extract from explicit evidence in the text.
If evidence is weak, vague, generic, or only loosely related, return null.
Do not guess.

SPARSITY SHUTDOWN:
If input is shorter than 15 words AND contains no concrete partner-preference statements:
- set all signals to null
- set confidence to 0.1
- evidence = []
- still extract explicit interests if present

GENERIC TEXT EXAMPLES:
- "I want a good person"
- "Someone nice"
- "Kind, loyal, funny"
- "Good values"

CONCRETE TEXT EXAMPLES:
- partner traits tied to behavior, communication, conflict, appearance, learning, family goals, home-life style

INTERESTS:
- Extract only explicit desired partner hobbies/interests into interests: string[] (pipeline maps to rawInterests)
- Do not invent hobbies from vibe or generic personality language
${joinExpansionInterestGuidanceBlocks()}

ALLOWED KEYS:
emotionalDepth, relationshipClarity, traditionalism, lifestylePace, socialBattery, physicalPriority, intellectualCuriosity, conflictStyle, casualIntimacyIntent, supportExchangeOrientation, supportProviderOrientation, supportRecipientOrientation, religiousObservance, educationLevel, honestyIntegrity, chronotype, physicalTypePreference, repairSkills, forgivenessStyle, stressResponse, jealousySecurity, listeningPresence, emotionalExpression, growthMindset, selfAwareness, patienceTolerance, intimacyPacing, monogamyAlignment, familyEnmeshment, friendCoupleBalance, aloneTimeNeed

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
- emotionalDepth = explicit vulnerability, emotional openness, naming feelings — not how outwardly feelings are verbally expressed alone (→ emotionalExpression)
- relationshipClarity = explicit desire for boundaries, labels, exclusivity, transparency, commitment rules — not exclusive-vs-open/poly structure alone (→ monogamyAlignment)
- traditionalism = explicit desire for kids, marriage, traditional family structure — not practical religious ritual observance alone (kosher/Shabbat/דתי practice → religiousObservance), and not day-to-day family-of-origin involvement/boundaries alone (→ familyEnmeshment)
- lifestylePace = quiet/calm/home-centered = lower; adventurous/high-action = higher — not morning vs night sleep chronotype
- socialBattery = explicit social-energy cues only — not friends-vs-couple time allocation alone (→ friendCoupleBalance)
- physicalPriority = explicit looks, attraction, chemistry, appearance — not casual vs committed intimacy boundary, and not which body/build type preference (→ physicalTypePreference)
- intellectualCuriosity = explicit learning, books, ideas, curiosity, deep conversations — not formal degree/credential filter (→ educationLevel)
- conflictStyle = explicit disagreement handling DURING conflict (direct / avoidant / escalating / calm discussion in the moment) — not post-conflict repair/apology alone (→ repairSkills), not forgiveness/grudge pacing alone (→ forgivenessStyle), and not day-to-day patience for quirks/flaws alone (→ patienceTolerance)
- casualIntimacyIntent = desired partner's casual vs committed-only physical intimacy stance (not looks priority alone, not speed-to-closeness alone → intimacyPacing)
- supportExchangeOrientation = desired openness to arrangement/money-in-relationship dynamics (not emotional support alone)
- supportProviderOrientation = wanting a partner who GIVES ongoing financial support
- supportRecipientOrientation = wanting a partner who RECEIVES / expects ongoing financial support
- religiousObservance = desired partner's practical religious practice level (not marriage/kids traditionalism alone)
- educationLevel = how much formal education/credentials matter in a partner (not intellectual curiosity alone)
- honestyIntegrity = desired partner honesty/integrity/"no games" emphasis (not bluntness alone); prefer null if unmentioned
- chronotype = desired partner sleep/energy rhythm early bird vs night owl (not lifestyle pace alone)
- physicalTypePreference = how specific body/build type preferences are for a partner (not looks-importance alone); race/anatomy-only → null
- repairSkills = desired partner post-conflict apology / ownership / reconnection vs stonewalling or avoiding resolution (not during-conflict style alone)
- forgivenessStyle = desired partner letting-go vs holding grudges / rehashing past issues (not attachment closeness alone, not in-the-moment regulation alone)
- stressResponse = desired partner pursue vs withdraw under stress (seek closeness HIGH ↔ handle alone LOW); not calm-reactivity alone, not attachment closeness alone
- jealousySecurity = desired partner jealousy/possessiveness vs trust (HIGH = more jealous; wanting secure/trusting → LOW); not independence alone
- listeningPresence = desired partner attention/presence when listening (distracted/interrupting LOW ↔ deeply present / makes them feel heard HIGH); not empathy/caring alone
- emotionalExpression = desired partner outward verbal expression of feelings/affection (reserved/actions-not-words LOW ↔ frequently says feelings HIGH); not emotional depth alone, not physical touch alone
- growthMindset = desired partner openness to feedback / willingness to change (defensive/fixed LOW ↔ seeks feedback and grows HIGH); not vulnerability/sharing-fears alone
- selfAwareness = desired partner insight into own patterns/triggers (little insight LOW ↔ clearly names patterns/origins HIGH); not calm-under-stress regulation alone, not empathy alone
- patienceTolerance = desired partner day-to-day tolerance for flaws/quirks/differences (highly critical LOW ↔ very patient/accepting HIGH); not during-conflict fight style alone
- intimacyPacing = desired partner speed toward emotional/physical closeness (very slow LOW ↔ moves fast HIGH); not casual-vs-committed intimacy type alone
- monogamyAlignment = desired partner exclusive-vs-open/poly structure expectation (strict mono LOW ↔ open/poly HIGH — do not invert); not labels/boundaries/dating-approach clarity alone
- familyEnmeshment = desired partner family-of-origin involvement in daily decisions/boundaries (very independent LOW ↔ highly enmeshed HIGH); not marriage/kids traditionalism alone
- friendCoupleBalance = desired partner friends-first vs couple-centric time allocation (friends-first LOW ↔ couple-centric HIGH — do not invert); not social-energy intro/extro alone
- aloneTimeNeed = desired partner need for solo recharge time (rarely needs alone time LOW ↔ strong solo need HIGH); not general autonomy/fusion alone, not socialBattery alone

${joinExpansionPartnerShadowBlocks()}

DIRECTION LOCK:
For lifestylePace:
- calm, quiet, slow, peaceful, home-centered, low-drama -> LOWER scores
- busy, packed, fast, adventurous, high-energy -> HIGHER scores
Never reverse this direction.

FAMILY LANGUAGE RULE:
Kids, family, marriage, traditional future -> traditionalism only.
Practical religious ritual (kosher, Shabbat, prayer, דתי practice level) -> religiousObservance.
Do NOT map family/kids phrases to relationshipClarity unless the quote is explicitly about rules, labels, boundaries, exclusivity, or transparency.
Day-to-day family-of-origin involvement / boundaries (not marriage/kids path alone) -> familyEnmeshment when explicit.

PHYSICAL GUARD:
Do NOT infer physicalPriority from warmth, stability, emotional language, or family language.

HARD SEMANTIC GUARD:
Do NOT map generic warmth, sincerity, maturity, or positive character language to deeper traits.
Examples:
- "kind", "nice", "mature" -> ignore
- "growth", "accountability" -> NOT emotionalDepth
- "quiet home" -> lifestylePace only
- "no drama" -> conflictStyle only if explicit conflict behavior
- "accountable after fights" / "doesn't hold grudges" -> repairSkills / forgivenessStyle when explicit; do not dump into conflictStyle alone
- "needs me close when stressed" / "jealous / needs check-ins" -> stressResponse / jealousySecurity when explicit; do not dump into attachmentSecurity or independence alone
- "puts phone away / really listens" / "says I love you often / open about feelings" -> listeningPresence / emotionalExpression when explicit; do not dump into emotionalDepth alone
- "welcomes feedback / always working on being a better partner" / "I know I shut down when criticized" -> growthMindset / selfAwareness when explicit; do not dump into vulnerability or regulation alone
- "patient with quirks" / "moves fast / takes it slow" / "exclusive only" / "open / poly" -> patienceTolerance / intimacyPacing / monogamyAlignment when explicit; do not dump into conflictStyle, casualIntimacyIntent, or relationshipClarity alone
- "family involved in decisions" / "friends first vs couple time" / "needs alone time to recharge" -> familyEnmeshment / friendCoupleBalance / aloneTimeNeed when explicit; do not dump into traditionalism or socialBattery alone
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

Output JSON:
{ "domain": "partner", "signals": { "key": int|null }, "interests": [], "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

export function getSystemPromptForDomain(domain: ExtractionDomain): string {
  switch (domain) {
    case 'self':
      return SELF_EXTRACTOR_PROMPT;
    case 'relationship':
      return RELATIONSHIP_EXTRACTOR_PROMPT;
    case 'partner':
      return PARTNER_EXTRACTOR_PROMPT;
  }
}

/** Short hash of legacy system prompt for debug logs (kept for backward compat). */
export const SYSTEM_PROMPT_HASH = createHash('sha256')
  .update(SELF_EXTRACTOR_PROMPT)
  .digest('hex')
  .slice(0, 12);
