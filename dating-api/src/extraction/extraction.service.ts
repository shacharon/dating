import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import {
  EXTRACTION_SIGNAL_KEYS,
  EXTRACTION_SIGNAL_KEYS_SET,
  MAX_EVIDENCE_ITEMS,
  countNonNullSignals,
  type ExtractedSignals,
  type ExtractionDomain,
  type LLMUsageStats,
} from './extracted-signals.interface';
import {
  KEY_ALIASES,
  normalizeKeys,
  normalizeRawExtraction,
  normalizeRawInterestTags,
} from './extraction-normalization';
import { validateExtraction } from './extraction-strict-validation';
import { EXPANSION_01_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-01-signal-definitions';
import { EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-02-signal-definitions';
import { EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-03-signal-definitions';
import { EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-04-signal-definitions';
import { EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-05-signal-definitions';
import { EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-06-signal-definitions';
import {
  EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-07-signal-definitions';
import {
  EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-08-signal-definitions';
import {
  EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-10-signal-definitions';
import { EXPANSION_09_INTEREST_GUIDANCE_BLOCK } from './expansion-09-interest-guidance';
import {
  buildExtractionPipelineTrace,
  buildRawLlmPersistenceLogPayload,
  toExtractionSnapshot,
} from './pipeline-trace';

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
${EXPANSION_09_INTEREST_GUIDANCE_BLOCK}

ALLOWED KEYS:
emotionalDepth, attachmentSecurity, directness, independence, socialBattery, lifestylePace, ambition, healthBodyConsciousness, spirituality, intellectualCuriosity, conflictStyle, adventureNovelty, structureChaosTolerance, empathyCompassion, vulnerabilityOpenness, emotionalRegulation, physicalAffectionStyle, humorPlayfulness, creativeExpression, physicalActivityLevel, domesticComfort, casualIntimacyIntent, supportExchangeOrientation, supportProviderOrientation, supportRecipientOrientation, religiousObservance, educationLevel, honestyIntegrity, chronotype, physicalTypePreference, repairSkills, forgivenessStyle

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
- attachmentSecurity = explicit closeness, fusion, anchor-like bond, inseparable emotional union — not specifically how grudges/resentment are handled post-conflict (→ forgivenessStyle)
- directness = explicit transparency, no secrets, clear communication — not honesty/integrity/"no games" as a core relationship value alone, and not post-conflict ownership/apology alone (→ repairSkills)
- independence = explicit autonomy vs fusion; shared-everything / merged-life language = low
- socialBattery = explicit social-energy preference only
- lifestylePace = explicit pace/rhythm (calm vs high-action busy life) — not home-vs-out nesting preference alone, not novelty-vs-routine preference, and not morning vs night sleep chronotype
- ambition = explicit goals, drive — not formal education/credential preference alone
- healthBodyConsciousness = explicit health/wellness values focus (caring about health — not how much they actually exercise/move)
- spirituality = explicit spiritual/inner meaning orientation — not practical ritual observance level alone
- intellectualCuriosity = explicit need for mental stimulation / ideas / deep learning with a partner (not merely "I'm smart" or listing books, and not formal degree/credential filters)
- conflictStyle = explicit disagreement handling DURING conflict (direct / avoidant / escalating / de-escalating in the moment) — not post-conflict apology, ownership, or reconnection alone (→ repairSkills), and not grudge/forgiveness pacing alone (→ forgivenessStyle)
- adventureNovelty = explicit novelty vs routine / new-experiences preference (not life tempo alone, not homebody preference, not travel hobby tag alone)
- structureChaosTolerance = explicit order vs chaos preference
- empathyCompassion = explicit care for partner's feelings, attunement, compassionate responses (not generic kindness)
- vulnerabilityOpenness = explicit comfort sharing fears/struggles/authentic self (not merely "honest communication")
- emotionalRegulation = explicit emotional steadiness vs reactivity under stress; calm recovery in the moment (not merely "I'm emotional") — not letting go of grudges over time after conflict (→ forgivenessStyle)
- physicalAffectionStyle = explicit touch/cuddling/PDA/closeness needs (not general attractiveness, not casual vs committed intimacy boundary)
- humorPlayfulness = explicit need for banter, silliness, shared laughter, lightness in love (not merely "I'm funny" or generic "fun-loving")
- creativeExpression = explicit need for creative outlets / making / self-expression through creation (not merely job title "artist" or hobby tag)
- physicalActivityLevel = explicit daily athletic/activity behavior / how much they move (not merely wellness values or "I care about fitness")
- domesticComfort = explicit homebody vs always-out preference for evenings/weekends (not social energy intro/extro, not calm vs busy pace alone)
- casualIntimacyIntent = explicit casual vs committed-only physical intimacy stance (not looks priority, not affection/touch needs alone, not commitment-labels alone)
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

${EXPANSION_01_SELF_SHADOW_SIGNAL_BLOCK}

${EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK}

${EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK}

${EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK}

${EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK}

${EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK}

${EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK}

${EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK}

${EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK}

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
${EXPANSION_09_INTEREST_GUIDANCE_BLOCK}

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
${EXPANSION_09_INTEREST_GUIDANCE_BLOCK}

ALLOWED KEYS:
emotionalDepth, relationshipClarity, traditionalism, lifestylePace, socialBattery, physicalPriority, intellectualCuriosity, conflictStyle, casualIntimacyIntent, supportExchangeOrientation, supportProviderOrientation, supportRecipientOrientation, religiousObservance, educationLevel, honestyIntegrity, chronotype, physicalTypePreference, repairSkills, forgivenessStyle

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
- traditionalism = explicit desire for kids, marriage, traditional family structure — not practical religious ritual observance alone (kosher/Shabbat/דתי practice → religiousObservance)
- lifestylePace = quiet/calm/home-centered = lower; adventurous/high-action = higher — not morning vs night sleep chronotype
- socialBattery = explicit social-energy cues only
- physicalPriority = explicit looks, attraction, chemistry, appearance — not casual vs committed intimacy boundary, and not which body/build type preference (→ physicalTypePreference)
- intellectualCuriosity = explicit learning, books, ideas, curiosity, deep conversations — not formal degree/credential filter (→ educationLevel)
- conflictStyle = explicit disagreement handling DURING conflict (direct / avoidant / escalating / calm discussion in the moment) — not post-conflict repair/apology alone (→ repairSkills), not forgiveness/grudge pacing alone (→ forgivenessStyle)
- casualIntimacyIntent = desired partner's casual vs committed-only physical intimacy stance (not looks priority alone)
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

${EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK}

${EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK}

${EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK}

DIRECTION LOCK:
For lifestylePace:
- calm, quiet, slow, peaceful, home-centered, low-drama -> LOWER scores
- busy, packed, fast, adventurous, high-energy -> HIGHER scores
Never reverse this direction.

FAMILY LANGUAGE RULE:
Kids, family, marriage, traditional future -> traditionalism only.
Practical religious ritual (kosher, Shabbat, prayer, דתי practice level) -> religiousObservance.
Do NOT map family/kids phrases to relationshipClarity unless the quote is explicitly about rules, labels, boundaries, exclusivity, or transparency.

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

function getSystemPromptForDomain(domain: ExtractionDomain): string {
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
const SYSTEM_PROMPT_HASH = createHash('sha256')
  .update(SELF_EXTRACTOR_PROMPT)
  .digest('hex')
  .slice(0, 12);

const GPT4O_MINI_INPUT_COST = 0.15 / 1_000_000;
const GPT4O_MINI_OUTPUT_COST = 0.6 / 1_000_000;

function estimateCost(promptTokens: number, completionTokens: number): number {
  return (
    promptTokens * GPT4O_MINI_INPUT_COST +
    completionTokens * GPT4O_MINI_OUTPUT_COST
  );
}

function parseOpenAIUsage(usage: unknown): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const u =
    usage && typeof usage === 'object'
      ? (usage as Record<string, unknown>)
      : {};
  const promptTokens =
    typeof u.prompt_tokens === 'number' ? u.prompt_tokens : 0;
  const completionTokens =
    typeof u.completion_tokens === 'number' ? u.completion_tokens : 0;
  const totalTokens =
    typeof u.total_tokens === 'number'
      ? u.total_tokens
      : promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

function emptyUsage(): LLMUsageStats {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUSD: 0,
    durationMs: 0,
  };
}

function mergeUsage(a: LLMUsageStats, b: LLMUsageStats): LLMUsageStats {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    estimatedCostUSD: a.estimatedCostUSD + b.estimatedCostUSD,
    durationMs: a.durationMs + b.durationMs,
  };
}

@Injectable()
export class ExtractionService {
  constructor(
    private readonly llm: LLMRouterService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Build output from allowlist only. Round to int, enforce 1–10 or null.
   * Evidence filtered to official keys; alias rewritten to official.
   *
   * Technical cleanup only: no semantic inference or context-based modification.
   */
  private validateAndClean(
    data: ExtractedSignals,
    requestedDomain: ExtractionDomain,
  ): ExtractedSignals {
    const normalizedSignals = data.signals ?? {};

    const signals: Record<string, number | null> = {};
    for (const key of EXTRACTION_SIGNAL_KEYS) {
      const value = normalizedSignals[key];
      if (value === null || value === undefined) {
        signals[key] = null;
        continue;
      }
      const n = Number(value);
      const rounded = Number.isFinite(n) ? Math.round(n) : NaN;
      if (Number.isNaN(rounded) || rounded < 1 || rounded > 10) {
        signals[key] = null;
        this.logger.log(
          JSON.stringify({
            event: 'validateAndClean_stripped',
            key,
            value,
            reason: Number.isNaN(rounded) ? 'nan' : 'outOfRange',
          }),
          ExtractionService.name,
        );
      } else {
        signals[key] = rounded;
      }
    }

    const confidence = data.confidence ?? 0.5;

    const evidence = (data.evidence ?? [])
      .map((item) => {
        const s = String(item.signal).trim();
        const officialSignal = KEY_ALIASES[s] ?? s;
        const reason = typeof item.reason === 'string' ? item.reason : '';
        return { ...item, signal: officialSignal, reason };
      })
      .filter((item) => EXTRACTION_SIGNAL_KEYS_SET.has(item.signal))
      .slice(0, MAX_EVIDENCE_ITEMS);

    const rawInterests = normalizeRawInterestTags(data.rawInterests);

    return {
      domain: requestedDomain,
      signals,
      evidence,
      version: data.version ?? 'v1',
      confidence,
      notes: data.notes,
      ...(rawInterests.length > 0 ? { rawInterests } : {}),
    };
  }

  /** Stage 1: Build request metadata (prompt, requestId, preview, start time, usage accumulator). */
  private buildRequestMetadata(
    domain: ExtractionDomain,
    text: string,
  ): {
    userPrompt: string;
    requestId: string;
    inputText: string;
    inputPreview: string;
    extractStart: number;
    accUsage: LLMUsageStats;
  } {
    const extractStart = Date.now();
    const userPrompt = `Domain: ${domain}\nText:\n"""\n${text}\n"""`;
    const requestId = randomUUID();
    const inputText = text;
    const inputPreview = inputText.slice(0, 120);
    const accUsage = emptyUsage();
    this.logger.log(
      JSON.stringify({
        event: 'extraction_before_llm',
        domain,
        inputTextLength: inputText.length,
        inputTextPreview: inputPreview,
        systemPromptHash: SYSTEM_PROMPT_HASH,
        signalKeysListLength: EXTRACTION_SIGNAL_KEYS.length,
        requestId,
      }),
      ExtractionService.name,
    );
    return {
      userPrompt,
      requestId,
      inputText,
      inputPreview,
      extractStart,
      accUsage,
    };
  }

  /** Stage 2: Run first LLM extraction call (primary proposal). */
  private async runFirstLlmExtractionCall(
    domain: ExtractionDomain,
    userPrompt: string,
    requestId: string,
    inputTextLength: number,
  ): Promise<{
    value: Record<string, unknown>;
    rawText: string | null;
    usage: unknown;
  }> {
    const systemPrompt = getSystemPromptForDomain(domain);
    const { value, rawText, usage } = await this.llm.completeJSON<
      Record<string, unknown>
    >({
      modelKey: 'fast',
      system: systemPrompt,
      user: userPrompt,
      schema: z.any(),
      temperature: 0.1,
      maxTokens: 5000,
      timeoutMs: 120_000,
      requestId,
      purpose: 'extraction',
      ...(domain === 'partner' && {
        latencyStage: 'extraction_partner' as const,
        inputTextLength,
      }),
    });
    return { value, rawText, usage };
  }

  /** Stage 4: Normalize alias keys and log telemetry (technical mapping only). */
  private applyNormalizeAliasKeys(data: ExtractedSignals): ExtractedSignals {
    const { normalizedSignals, telemetry } = normalizeKeys(data.signals);
    this.logger.debug(
      JSON.stringify({
        event: 'normalizeKeys_telemetry',
        aliasesSeen: telemetry.aliasesSeen,
        aliasesMapped: telemetry.aliasesMapped,
        aliasesDroppedBecauseOfficialExists:
          telemetry.aliasesDroppedBecauseOfficialExists,
        unknownSignalKeysDropped: telemetry.unknownSignalKeysDropped,
      }),
    );
    return { ...data, signals: normalizedSignals };
  }

  /** Stage 11: Finalize usage and logging. */
  private finalizeUsageAndLogging(
    cleaned: ExtractedSignals,
    accUsage: LLMUsageStats,
    extractStart: number,
    domain: ExtractionDomain,
    requestId: string,
    profileId?: string,
  ): ExtractedSignals {
    const usageWithDuration: LLMUsageStats = {
      ...accUsage,
      durationMs: Date.now() - extractStart,
    };
    const result = { ...cleaned, _usage: usageWithDuration };
    const pid = profileId ?? requestId;
    this.logger.log(
      `[AnalyzeCost] profile=${pid} domain=${domain} model=gpt-4o-mini ` +
        `promptTokens=${usageWithDuration.promptTokens} completionTokens=${usageWithDuration.completionTokens} ` +
        `tokens=${usageWithDuration.totalTokens} cost=$${usageWithDuration.estimatedCostUSD.toFixed(5)} ` +
        `duration=${usageWithDuration.durationMs}ms`,
      ExtractionService.name,
    );
    return result;
  }

  /**
   * Extract signals for one domain.
   *
   * LLM-first: one proposal → normalizeRawExtraction → normalizeKeys → validateAndClean
   * → validateExtraction (evidence rows only; signals preserved).
   */
  async extract(
    domain: ExtractionDomain,
    text: string,
    profileId?: string,
  ): Promise<ExtractedSignals> {
    const {
      userPrompt,
      requestId,
      extractStart,
      inputText,
      accUsage: initialAccUsage,
    } = this.buildRequestMetadata(domain, text);

    // [PIPELINE] LLM proposal
    const { value, rawText, usage } = await this.runFirstLlmExtractionCall(
      domain,
      userPrompt,
      requestId,
      inputText.length,
    );

    this.logger.log(
      JSON.stringify(
        buildRawLlmPersistenceLogPayload(
          {
            pipeline: 'extraction_v1',
            domain,
            requestId,
            profileId: profileId ?? null,
          },
          value,
          rawText,
        ),
      ),
      ExtractionService.name,
    );

    const parsed = parseOpenAIUsage(usage);
    const accUsage = mergeUsage(initialAccUsage, {
      ...parsed,
      estimatedCostUSD: estimateCost(
        parsed.promptTokens,
        parsed.completionTokens,
      ),
      durationMs: 0,
    });

    const rawModelOutputPreview = (rawText ?? '').trim().slice(0, 120);
    const llmSignals =
      value && typeof value === 'object' && value.signals
        ? (value.signals as Record<string, unknown>)
        : {};
    const llmKeysPresent = Object.entries(llmSignals)
      .filter(([, v]) => v != null)
      .map(([k]) => k);
    const llmNonNullCount = llmKeysPresent.length;
    if ((rawText ?? '').trim().length === 0) {
      this.logger.log(
        JSON.stringify({
          event: 'EMPTY_MODEL_TEXT',
          requestId,
          purpose: 'extraction',
        }),
        ExtractionService.name,
      );
    }
    this.logger.log(
      JSON.stringify({
        stage: 'after_llm',
        domain,
        nonNullCount: llmNonNullCount,
        keysPresent: llmKeysPresent,
        raw: (rawText ?? '').slice(0, 500),
      }),
      ExtractionService.name,
    );
    this.logger.log(
      JSON.stringify({
        event: 'extraction_after_llm',
        domain,
        requestId,
        rawModelOutputPreview,
      }),
      ExtractionService.name,
    );

    // [PIPELINE] Technical normalization
    const normalized = normalizeRawExtraction(value, domain);
    const normalizedKeysPresent = Object.entries(normalized.signals ?? {})
      .filter(([, v]) => v != null)
      .map(([k]) => k);
    this.logger.log(
      JSON.stringify({
        stage: 'after_normalize',
        domain,
        nonNullCount: normalizedKeysPresent.length,
        keysPresent: normalizedKeysPresent,
      }),
      ExtractionService.name,
    );
    const afterAlias = this.applyNormalizeAliasKeys(normalized);
    let cleaned = this.validateAndClean(afterAlias, domain);
    const snapAfterClean = toExtractionSnapshot(cleaned);
    this.logger.log(
      JSON.stringify({
        stage: 'after_validate',
        domain,
        nonNullCount: countNonNullSignals(cleaned.signals),
      }),
      ExtractionService.name,
    );

    const finalNonNull = countNonNullSignals(cleaned.signals);
    if (finalNonNull === 0 && text.trim().length > 0) {
      cleaned = {
        ...cleaned,
        notes:
          (cleaned.notes ? `${cleaned.notes}; ` : '') +
          'EXTRACTION_EMPTY_DEBUG',
        debug: { rawModelOutput: (rawText ?? '').slice(0, 1000) },
      };
    }

    const snapPreValidateExtraction = toExtractionSnapshot(cleaned);

    cleaned = validateExtraction(text, cleaned, (payload) =>
      this.logger.debug(JSON.stringify(payload), ExtractionService.name),
    );

    const trace = buildExtractionPipelineTrace({
      pipeline: 'extraction_v1',
      domain,
      requestId,
      profileId,
      parsedJson: value,
      rawText,
      stageSnapshots: [
        {
          name: 'normalizeRawExtraction',
          snapshot: toExtractionSnapshot(normalized),
        },
        {
          name: 'alias_normalization',
          snapshot: toExtractionSnapshot(afterAlias),
        },
        { name: 'validate_and_clean', snapshot: snapAfterClean },
        { name: 'pre_validateExtraction', snapshot: snapPreValidateExtraction },
        { name: 'validateExtraction', snapshot: toExtractionSnapshot(cleaned) },
      ],
    });

    this.logger.log(
      JSON.stringify({
        event: 'extraction_pipeline_stage_diffs',
        domain,
        requestId,
        profileId: profileId ?? null,
        stageDiffs: trace.stageDiffs,
      }),
      ExtractionService.name,
    );

    const provenanceStages: string[] = [
      'llm',
      'alias_normalization',
      'validate_and_clean',
      'strict_evidence_validation',
    ];

    const withProvenance: ExtractedSignals = {
      ...cleaned,
      _provenance: { stages: provenanceStages },
      _pipelineTrace: trace,
    };

    this.logger.debug(
      JSON.stringify({
        event: 'extraction_provenance',
        domain,
        requestId,
        stages: provenanceStages,
      }),
    );
    this.logger.log(
      JSON.stringify({
        stage: 'final',
        domain,
        nonNullCount: countNonNullSignals(withProvenance.signals),
        confidence: withProvenance.confidence,
        finalSignals: withProvenance.signals,
      }),
      ExtractionService.name,
    );

    return this.finalizeUsageAndLogging(
      withProvenance,
      accUsage,
      extractStart,
      domain,
      requestId,
      profileId,
    );
  }

  /** Run all three domain extractions in parallel. */
  async extractAllThree(
    aboutMe: string,
    aboutRelationship: string,
    aboutPartner: string,
    profileId?: string,
  ): Promise<{
    self: ExtractedSignals;
    relationship: ExtractedSignals;
    partner: ExtractedSignals;
    _usage: LLMUsageStats;
  }> {
    const extractStartedAt = Date.now();
    const batchRequestId = randomUUID();

    const [self, relationship, partner] = await Promise.all([
      this.extract('self', aboutMe.trim(), profileId),
      this.extract('relationship', aboutRelationship.trim(), profileId),
      this.extract('partner', aboutPartner.trim(), profileId),
    ]);

    const durations = {
      self: self._usage?.durationMs ?? 0,
      relationship: relationship._usage?.durationMs ?? 0,
      partner: partner._usage?.durationMs ?? 0,
      totalMs: Date.now() - extractStartedAt,
    };

    this.logger.log(
      JSON.stringify({
        event: 'extract_split_done',
        durations,
        requestId: batchRequestId,
      }),
      ExtractionService.name,
    );

    const _usage = [self, relationship, partner].reduce(
      (acc, s) => mergeUsage(acc, s._usage ?? emptyUsage()),
      emptyUsage(),
    );
    return { self, relationship, partner, _usage };
  }
}
