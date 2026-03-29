/**
 * V2 Extraction Service - 9-call split architecture.
 * 
 * Architecture:
 * - 3 domains (self, partner, relationship)
 * - 3 extractors per domain (base signals, interests, negatives)
 * - Total: 9 parallel LLM calls via Promise.all()
 * 
 * Key changes from V1:
 * - Base signals prompts: NO interests extraction (removed)
 * - Interests: Separate dedicated extractor
 * - Negatives: NEW layer (explicit dealbreakers)
 * - All calls independent, failure-tolerant
 * 
 * STRICT RULE: All extractors use ONLY explicit evidence. NO inference.
 */

import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import {
  EXTRACTION_SIGNAL_KEYS_SET,
  MAX_EVIDENCE_ITEMS,
  countNonNullSignals,
  type ExtractedSignals,
  type ExtractionDomain,
  type LLMUsageStats,
} from './extracted-signals.interface';
import { KEY_ALIASES, normalizeKeys, normalizeRawExtraction } from './extraction-normalization';
import { validateExtraction } from './extraction-strict-validation';
import { InterestsExtractionService } from './interests-extraction.service';
import { NegativesExtractionService } from './negatives-extraction.service';
import type { InterestItem } from './extracted-interests.interface';
import type { NegativeItem } from './extracted-negatives.interface';

/**
 * V2 Base Signal Extractor Prompts - NO INTERESTS SECTION
 * Only psychological signals extraction.
 */

const SELF_BASE_SIGNALS_PROMPT_V2 = `You are a professional psychological profiler. Extract ONLY psychological signals for domain: self.

STRICT RULE:
ONLY extract from EXPLICIT evidence in the text.
NO inference. NO guessing.
If evidence is weak, vague, generic, or only loosely related, return null.

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

Output JSON:
{ "domain": "self", "signals": { "key": int|null }, "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

const RELATIONSHIP_BASE_SIGNALS_PROMPT_V2 = `You are a professional psychological profiler. Extract ONLY psychological signals for domain: relationship.

STRICT RULE:
ONLY extract from EXPLICIT evidence in the text.
NO inference. NO guessing.
If evidence is weak, vague, generic, or only loosely related, return null.

SPARSITY SHUTDOWN:
If input is shorter than 15 words OR contains fewer than 2 concrete relationship-structure statements:
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
{ "domain": "relationship", "signals": { "key": int|null }, "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

const PARTNER_BASE_SIGNALS_PROMPT_V2 = `You are a professional psychological profiler. Extract ONLY psychological signals for domain: partner.

STRICT RULE:
ONLY extract from EXPLICIT evidence in the text.
NO inference. NO guessing.
If evidence is weak, vague, generic, or only loosely related, return null.

SPARSITY SHUTDOWN:
If input is shorter than 15 words OR contains fewer than 2 concrete partner-preference statements:
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

Output JSON:
{ "domain": "partner", "signals": { "key": int|null }, "evidence": [{ "signal": "key", "quote": "...", "reason": "..." }], "confidence": 0..1 }`;

function getBaseSignalsPromptV2(domain: ExtractionDomain): string {
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
const BASE_SIGNALS_PROMPT_HASH_V2 = createHash('sha256')
  .update(SELF_BASE_SIGNALS_PROMPT_V2)
  .digest('hex')
  .slice(0, 12);

const INTERESTS_PROMPT_HASH = 'interests_v1'; // placeholder, from InterestsExtractionService
const NEGATIVES_PROMPT_HASH = 'negatives_v1'; // placeholder, from NegativesExtractionService

function emptyUsage(): LLMUsageStats {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUSD: 0, durationMs: 0 };
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

const GPT4O_MINI_INPUT_COST = 0.15 / 1_000_000;
const GPT4O_MINI_OUTPUT_COST = 0.60 / 1_000_000;

function estimateCost(promptTokens: number, completionTokens: number): number {
  return promptTokens * GPT4O_MINI_INPUT_COST + completionTokens * GPT4O_MINI_OUTPUT_COST;
}

function parseOpenAIUsage(usage: unknown): { promptTokens: number; completionTokens: number; totalTokens: number } {
  const u = usage && typeof usage === 'object' ? (usage as Record<string, unknown>) : {};
  const promptTokens = typeof u.prompt_tokens === 'number' ? u.prompt_tokens : 0;
  const completionTokens = typeof u.completion_tokens === 'number' ? u.completion_tokens : 0;
  const totalTokens = typeof u.total_tokens === 'number' ? u.total_tokens : promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

export interface ExtractionV2Result {
  version: 'v2';
  extractedAt: string;
  
  base: {
    self: ExtractedSignals;
    partner: ExtractedSignals;
    relationship: ExtractedSignals;
  };
  
  interests: {
    self: InterestItem[];
    partner: InterestItem[];
    relationship: InterestItem[];
  };
  
  negatives: {
    self: NegativeItem[];
    partner: NegativeItem[];
    relationship: NegativeItem[];
  };
  
  _usage: LLMUsageStats;
  _provenance: {
    extractorVersion: string;
    promptHashes: {
      base: string;
      interests: string;
      negatives: string;
    };
  };
}

@Injectable()
export class ExtractionV2Service {
  constructor(
    private readonly llm: LLMRouterService,
    private readonly logger: SimpleLogger,
    private readonly interestsService: InterestsExtractionService,
    private readonly negativesService: NegativesExtractionService,
  ) { }

  /**
   * Validate and clean base signals output (same as V1).
   */
  private validateAndClean(
    data: ExtractedSignals,
    requestedDomain: ExtractionDomain,
  ): ExtractedSignals {
    const normalizedSignals = data.signals ?? {};

    const signals: Record<string, number | null> = {};
    for (const key of Object.keys(normalizedSignals)) {
      if (!EXTRACTION_SIGNAL_KEYS_SET.has(key)) continue;
      
      const value = normalizedSignals[key];
      if (value === null || value === undefined) {
        signals[key] = null;
        continue;
      }
      const n = Number(value);
      const rounded = Number.isFinite(n) ? Math.round(n) : NaN;
      if (Number.isNaN(rounded) || rounded < 1 || rounded > 10) {
        signals[key] = null;
      } else {
        signals[key] = rounded;
      }
    }

    const confidence = data.confidence ?? 0.5;

    const evidence = (data.evidence ?? [])
      .map((item) => {
        const s = String(item.signal).trim();
        const officialSignal = KEY_ALIASES[s] ?? s;
        const reason =
          typeof item.reason === 'string' ? item.reason : '';
        return { ...item, signal: officialSignal, reason };
      })
      .filter((item) => EXTRACTION_SIGNAL_KEYS_SET.has(item.signal))
      .slice(0, MAX_EVIDENCE_ITEMS);

    return {
      domain: requestedDomain,
      signals,
      evidence,
      version: data.version ?? 'v1',
      confidence,
      notes: data.notes,
    };
  }

  /**
   * Extract base signals for one domain (V2 prompt, no interests).
   */
  async extractBaseSignals(
    domain: ExtractionDomain,
    text: string,
    profileId?: string,
  ): Promise<ExtractedSignals> {
    const extractStart = Date.now();
    const userPrompt = `Domain: ${domain}\nText:\n"""\n${text}\n"""`;
    const requestId = randomUUID();
    const inputText = text;
    
    this.logger.log(
      JSON.stringify({
        event: 'extraction_v2_base_before_llm',
        domain,
        inputTextLength: inputText.length,
        promptHash: BASE_SIGNALS_PROMPT_HASH_V2,
        requestId,
      }),
      ExtractionV2Service.name,
    );

    const systemPrompt = getBaseSignalsPromptV2(domain);
    const { value, rawText, usage } = await this.llm.completeJSON<Record<string, unknown>>({
      modelKey: 'fast',
      system: systemPrompt,
      user: userPrompt,
      schema: z.any(),
      temperature: 0.1,
      maxTokens: 5000,
      timeoutMs: 120_000,
      requestId,
      purpose: 'extraction-v2-base',
    });

    const parsed = parseOpenAIUsage(usage);
    const accUsage: LLMUsageStats = {
      ...parsed,
      estimatedCostUSD: estimateCost(parsed.promptTokens, parsed.completionTokens),
      durationMs: Date.now() - extractStart,
    };

    const normalized = normalizeRawExtraction(value, domain);
    const norm = normalizeKeys(normalized.signals);
    normalized.signals = norm.normalizedSignals;
    let cleaned = this.validateAndClean(normalized, domain);
    
    // Apply strict validation (same as V1)
    cleaned = validateExtraction(text, cleaned);
    
    const withProvenance: ExtractedSignals = {
      ...cleaned,
      _provenance: { stages: ['llm', 'alias_normalization', 'validate_and_clean', 'strict_evidence_validation'] },
    };

    return {
      ...withProvenance,
      _usage: accUsage,
    };
  }

  /**
   * Run all 9 extractions in parallel and return combined result.
   * 
   * Architecture:
   * - 3 domains × 3 extractors = 9 parallel calls
   * - Failure-tolerant: each call independent
   * - Relationship negatives disabled (V2 initial)
   */
  async extractAll(
    aboutMe: string,
    aboutPartner: string,
    aboutRelationship: string,
    profileId?: string,
  ): Promise<ExtractionV2Result> {
    const extractStart = Date.now();
    const batchRequestId = randomUUID();

    this.logger.log(
      JSON.stringify({
        event: 'extraction_v2_batch_start',
        requestId: batchRequestId,
        profileId,
      }),
      ExtractionV2Service.name,
    );

    // 9 parallel calls
    const [
      selfBase,
      selfInterests,
      selfNegatives,
      partnerBase,
      partnerInterests,
      partnerNegatives,
      relationshipBase,
      relationshipInterests,
      relationshipNegatives,
    ] = await Promise.all([
      // SELF domain
      this.extractBaseSignals('self', aboutMe.trim(), profileId),
      this.interestsService.extractForDomain('self', aboutMe.trim()),
      this.negativesService.extractForDomain('self', aboutMe.trim()),
      
      // PARTNER domain
      this.extractBaseSignals('partner', aboutPartner.trim(), profileId),
      this.interestsService.extractForDomain('partner', aboutPartner.trim()),
      this.negativesService.extractForDomain('partner', aboutPartner.trim()),
      
      // RELATIONSHIP domain
      this.extractBaseSignals('relationship', aboutRelationship.trim(), profileId),
      this.interestsService.extractForDomain('relationship', aboutRelationship.trim()),
      this.negativesService.extractForDomain('relationship', aboutRelationship.trim()),
    ]);

    const totalDurationMs = Date.now() - extractStart;

    // Merge usage stats
    const baseUsages = [
      selfBase._usage,
      partnerBase._usage,
      relationshipBase._usage,
    ].filter((u): u is LLMUsageStats => u !== undefined);

    const _usage = baseUsages.reduce(
      (acc, u) => mergeUsage(acc, u),
      emptyUsage(),
    );
    // Note: interests and negatives usage not tracked separately for now (non-blocking)

    this.logger.log(
      JSON.stringify({
        event: 'extraction_v2_batch_done',
        requestId: batchRequestId,
        totalDurationMs,
        baseSignalsNonNull: {
          self: countNonNullSignals(selfBase.signals),
          partner: countNonNullSignals(partnerBase.signals),
          relationship: countNonNullSignals(relationshipBase.signals),
        },
        interestsCount: {
          self: selfInterests.length,
          partner: partnerInterests.length,
          relationship: relationshipInterests.length,
        },
        negativesCount: {
          self: selfNegatives.items.length,
          partner: partnerNegatives.items.length,
          relationship: relationshipNegatives.items.length,
        },
      }),
      ExtractionV2Service.name,
    );

    return {
      version: 'v2',
      extractedAt: new Date().toISOString(),
      base: {
        self: selfBase,
        partner: partnerBase,
        relationship: relationshipBase,
      },
      interests: {
        self: selfInterests,
        partner: partnerInterests,
        relationship: relationshipInterests,
      },
      negatives: {
        self: selfNegatives.items,
        partner: partnerNegatives.items,
        relationship: relationshipNegatives.items,
      },
      _usage,
      _provenance: {
        extractorVersion: 'v2_9call',
        promptHashes: {
          base: BASE_SIGNALS_PROMPT_HASH_V2,
          interests: INTERESTS_PROMPT_HASH,
          negatives: NEGATIVES_PROMPT_HASH,
        },
      },
    };
  }
}
