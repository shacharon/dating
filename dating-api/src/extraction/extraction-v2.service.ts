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
import { randomUUID } from 'node:crypto';
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
import {
  KEY_ALIASES,
  normalizeKeys,
  normalizeRawExtraction,
} from './extraction-normalization';
import { validateExtraction } from './extraction-strict-validation';
import {
  buildExtractionPipelineTrace,
  buildRawLlmPersistenceLogPayload,
  toExtractionSnapshot,
} from './pipeline-trace';
import { InterestsExtractionService } from './interests-extraction.service';
import { NegativesExtractionService } from './negatives-extraction.service';
import type { InterestItem } from './extracted-interests.interface';
import type { NegativeItem } from './extracted-negatives.interface';
import {
  buildEvaluateLlmTrace,
  buildEvaluateRawLlmLogPayload,
} from '../evaluate/evaluate-llm-pipeline';

import {
  BASE_SIGNALS_PROMPT_HASH_V2,
  INTERESTS_PROMPT_HASH,
  NEGATIVES_PROMPT_HASH,
  RAW_INTERESTS_PROMPT_HASH,
  RAW_NEGATIVES_PREFS_PROMPT_HASH,
  getBaseSignalsPromptV2,
  getRawInterestsPromptV2,
  getRawNegativePreferencesPromptV2,
} from './extraction-v2.prompts';
import {
  BaseSignalsOutputSchemaByDomain,
  RAW_INTERESTS_SCHEMA,
  RAW_NEGATIVE_PREFERENCES_SCHEMA,
  emptyUsage,
  estimateCost,
  mergeUsage,
  parseOpenAIUsage,
} from './extraction-v2.schemas';

const GENERIC_RAW_INTERESTS = new Set<string>([
  'life',
  'people',
  'fun',
  'love',
  'relationship',
  'relationships',
  'dating',
]);

const GENERIC_NEGATIVE_ITEMS = new Set<string>([
  'bad',
  'toxic',
  'issues',
  'problems',
  'people',
  'person',
]);

function normalizeRawInterests(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const normalized = item
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) continue;
    if (GENERIC_RAW_INTERESTS.has(normalized)) continue;
    const words = normalized.split(' ').filter(Boolean);
    if (words.length < 1 || words.length > 3) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= 10) break;
  }
  return out;
}

function normalizeNegativeItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const normalized = item
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) continue;
    if (GENERIC_NEGATIVE_ITEMS.has(normalized)) continue;
    const words = normalized.split(' ').filter(Boolean);
    if (words.length < 1 || words.length > 3) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= 10) break;
  }
  return out;
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
      rawInterests?: string;
      rawNegativePreferences?: string;
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
  ) {}

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
        const reason = typeof item.reason === 'string' ? item.reason : '';
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
    const outputSchema = BaseSignalsOutputSchemaByDomain[domain];
    const { value, rawText, usage } = await this.llm.completeJSON<
      Record<string, unknown>
    >({
      modelKey: 'fast',
      system: systemPrompt,
      user: userPrompt,
      schema: outputSchema,
      temperature: 0.1,
      maxTokens: 5000,
      timeoutMs: 120_000,
      requestId,
      purpose: 'extraction-v2-base',
    });

    this.logger.log(
      JSON.stringify(
        buildRawLlmPersistenceLogPayload(
          {
            pipeline: 'extraction_v2_base',
            domain,
            requestId,
            profileId: profileId ?? null,
          },
          value,
          rawText,
        ),
      ),
      ExtractionV2Service.name,
    );

    const parsed = parseOpenAIUsage(usage);
    const accUsage: LLMUsageStats = {
      ...parsed,
      estimatedCostUSD: estimateCost(
        parsed.promptTokens,
        parsed.completionTokens,
      ),
      durationMs: Date.now() - extractStart,
    };

    const normalized = normalizeRawExtraction(value, domain);
    const snapAfterNormalizeRaw = toExtractionSnapshot(normalized);
    if (domain === 'self') {
      const rawSignals =
        value && typeof value === 'object' ? value.signals : undefined;
      const rawSelfRelationshipClarity =
        rawSignals && typeof rawSignals === 'object'
          ? (rawSignals as Record<string, unknown>).relationshipClarity
          : null;
      this.logger.debug(
        JSON.stringify({
          event: 'self_relationship_clarity_trace',
          stage: 'raw_llm_output',
          domain,
          requestId,
          value: rawSelfRelationshipClarity ?? null,
        }),
      );
      this.logger.debug(
        JSON.stringify({
          event: 'self_relationship_clarity_trace',
          stage: 'normalizeRawExtraction',
          domain,
          requestId,
          value: normalized.signals?.relationshipClarity ?? null,
        }),
      );
    }
    const norm = normalizeKeys(normalized.signals);
    if (domain === 'self') {
      this.logger.debug(
        JSON.stringify({
          event: 'self_relationship_clarity_trace',
          stage: 'normalizeKeys',
          domain,
          requestId,
          value: norm.normalizedSignals.relationshipClarity ?? null,
        }),
      );
    }
    normalized.signals = norm.normalizedSignals;
    const snapAfterAlias = toExtractionSnapshot(normalized);
    let cleaned = this.validateAndClean(normalized, domain);
    const snapAfterValidateAndClean = toExtractionSnapshot(cleaned);
    if (domain === 'self') {
      this.logger.debug(
        JSON.stringify({
          event: 'self_relationship_clarity_trace',
          stage: 'validateAndClean',
          domain,
          requestId,
          value: cleaned.signals.relationshipClarity ?? null,
        }),
      );
    }

    cleaned = validateExtraction(text, cleaned, (payload) =>
      this.logger.debug(JSON.stringify(payload), ExtractionV2Service.name),
    );
    if (domain === 'self') {
      this.logger.debug(
        JSON.stringify({
          event: 'self_relationship_clarity_trace',
          stage: 'validateExtraction',
          domain,
          requestId,
          value: cleaned.signals.relationshipClarity ?? null,
        }),
      );
    }

    const trace = buildExtractionPipelineTrace({
      pipeline: 'extraction_v2_base',
      domain,
      requestId,
      profileId,
      parsedJson: value,
      rawText,
      stageSnapshots: [
        { name: 'normalizeRawExtraction', snapshot: snapAfterNormalizeRaw },
        { name: 'alias_normalization', snapshot: snapAfterAlias },
        { name: 'validate_and_clean', snapshot: snapAfterValidateAndClean },
        { name: 'validateExtraction', snapshot: toExtractionSnapshot(cleaned) },
      ],
    });

    this.logger.log(
      JSON.stringify({
        event: 'extraction_pipeline_stage_diffs',
        pipeline: 'extraction_v2_base',
        domain,
        requestId,
        profileId: profileId ?? null,
        stageDiffs: trace.stageDiffs,
      }),
      ExtractionV2Service.name,
    );

    const withProvenance: ExtractedSignals = {
      ...cleaned,
      _provenance: {
        stages: [
          'llm',
          'alias_normalization',
          'validate_and_clean',
          'strict_evidence_validation',
        ],
      },
      _pipelineTrace: trace,
    };

    return {
      ...withProvenance,
      _usage: accUsage,
    };
  }

  /**
   * Dedicated rawInterests extractor for one domain.
   * Separate from base signal extraction; no scoring impact.
   */
  private async extractRawInterestsForDomain(
    domain: ExtractionDomain,
    text: string,
  ): Promise<string[]> {
    const requestId = randomUUID();
    const systemPrompt = getRawInterestsPromptV2(domain);
    const userPrompt = `Domain: ${domain}\nText:\n"""\n${text}\n"""`;

    try {
      const { value, rawText } = await this.llm.completeJSON<{
        rawInterests: string[];
      }>({
        modelKey: 'fast',
        system: systemPrompt,
        user: userPrompt,
        schema: RAW_INTERESTS_SCHEMA,
        temperature: 0.1,
        maxTokens: 1000,
        timeoutMs: 90_000,
        requestId,
        purpose: 'extraction-v2-raw-interests',
      });

      this.logger.log(
        JSON.stringify(
          buildEvaluateRawLlmLogPayload(
            { purpose: 'extraction-v2-raw-interests', domain, requestId },
            value,
            rawText,
          ),
        ),
        ExtractionV2Service.name,
      );

      const rawInterests = normalizeRawInterests(value.rawInterests);
      const auxTrace = buildEvaluateLlmTrace({
        purpose: 'extraction-v2-raw-interests',
        requestId,
        parsedJson: value,
        rawText,
        afterStages: [
          { name: 'after_normalizeRawInterests', value: { rawInterests } },
        ],
      });
      this.logger.log(
        JSON.stringify({
          event: 'evaluate_llm_pipeline_stage_diffs',
          ...auxTrace,
        }),
        ExtractionV2Service.name,
      );
      this.logger.debug(
        JSON.stringify({
          event: 'raw_interests_extracted',
          domain,
          requestId,
          rawInterests,
        }),
      );
      return rawInterests;
    } catch {
      this.logger.debug(
        JSON.stringify({
          event: 'raw_interests_extracted',
          domain,
          requestId,
          rawInterests: [],
        }),
      );
      return [];
    }
  }

  /**
   * Dedicated negatives/preferences extractor for one domain.
   * Separate from base signal extraction; no scoring impact.
   */
  private async extractRawNegativePreferencesForDomain(
    domain: ExtractionDomain,
    text: string,
  ): Promise<{
    negativePreferences: string[];
    softNo: string[];
    dealbreakers: string[];
  }> {
    const requestId = randomUUID();
    const systemPrompt = getRawNegativePreferencesPromptV2(domain);
    const userPrompt = `Domain: ${domain}\nText:\n"""\n${text}\n"""`;

    try {
      const { value, rawText } = await this.llm.completeJSON<{
        negativePreferences: string[];
        softNo: string[];
        dealbreakers: string[];
      }>({
        modelKey: 'fast',
        system: systemPrompt,
        user: userPrompt,
        schema: RAW_NEGATIVE_PREFERENCES_SCHEMA,
        temperature: 0.1,
        maxTokens: 1200,
        timeoutMs: 90_000,
        requestId,
        purpose: 'extraction-v2-negative-preferences',
      });

      this.logger.log(
        JSON.stringify(
          buildEvaluateRawLlmLogPayload(
            {
              purpose: 'extraction-v2-negative-preferences',
              domain,
              requestId,
            },
            value,
            rawText,
          ),
        ),
        ExtractionV2Service.name,
      );

      const negativePreferences = normalizeNegativeItems(
        value.negativePreferences,
      );
      const softNo = normalizeNegativeItems(value.softNo);
      const dealbreakers = normalizeNegativeItems(value.dealbreakers);
      const normalizedOut = { negativePreferences, softNo, dealbreakers };
      const auxTrace = buildEvaluateLlmTrace({
        purpose: 'extraction-v2-negative-preferences',
        requestId,
        parsedJson: value,
        rawText,
        afterStages: [
          { name: 'after_normalizeNegativeItems', value: normalizedOut },
        ],
      });
      this.logger.log(
        JSON.stringify({
          event: 'evaluate_llm_pipeline_stage_diffs',
          ...auxTrace,
        }),
        ExtractionV2Service.name,
      );

      this.logger.debug(
        JSON.stringify({
          event: 'negative_preferences_extracted',
          domain,
          requestId,
          negativePreferences,
          softNo,
          dealbreakers,
        }),
      );
      return normalizedOut;
    } catch {
      this.logger.debug(
        JSON.stringify({
          event: 'negative_preferences_extracted',
          domain,
          requestId,
          negativePreferences: [],
          softNo: [],
          dealbreakers: [],
        }),
      );
      return { negativePreferences: [], softNo: [], dealbreakers: [] };
    }
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
      this.extractBaseSignals(
        'relationship',
        aboutRelationship.trim(),
        profileId,
      ),
      this.interestsService.extractForDomain(
        'relationship',
        aboutRelationship.trim(),
      ),
      this.negativesService.extractForDomain(
        'relationship',
        aboutRelationship.trim(),
      ),
    ]);

    // Dedicated rawInterests extraction (separate from base signal extraction)
    const [selfRawInterests, partnerRawInterests, relationshipRawInterests] =
      await Promise.all([
        this.extractRawInterestsForDomain('self', aboutMe.trim()),
        this.extractRawInterestsForDomain('partner', aboutPartner.trim()),
        this.extractRawInterestsForDomain(
          'relationship',
          aboutRelationship.trim(),
        ),
      ]);

    const [selfNegPrefs, partnerNegPrefs, relationshipNegPrefs] =
      await Promise.all([
        this.extractRawNegativePreferencesForDomain('self', aboutMe.trim()),
        this.extractRawNegativePreferencesForDomain(
          'partner',
          aboutPartner.trim(),
        ),
        this.extractRawNegativePreferencesForDomain(
          'relationship',
          aboutRelationship.trim(),
        ),
      ]);

    const selfBaseWithRaw: ExtractedSignals = {
      ...selfBase,
      rawInterests: selfRawInterests,
      negativePreferences: selfNegPrefs.negativePreferences,
      softNo: selfNegPrefs.softNo,
      dealbreakers: selfNegPrefs.dealbreakers,
    };
    const partnerBaseWithRaw: ExtractedSignals = {
      ...partnerBase,
      rawInterests: partnerRawInterests,
      negativePreferences: partnerNegPrefs.negativePreferences,
      softNo: partnerNegPrefs.softNo,
      dealbreakers: partnerNegPrefs.dealbreakers,
    };
    const relationshipBaseWithRaw: ExtractedSignals = {
      ...relationshipBase,
      rawInterests: relationshipRawInterests,
      negativePreferences: relationshipNegPrefs.negativePreferences,
      softNo: relationshipNegPrefs.softNo,
      dealbreakers: relationshipNegPrefs.dealbreakers,
    };

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
          self: countNonNullSignals(selfBaseWithRaw.signals),
          partner: countNonNullSignals(partnerBaseWithRaw.signals),
          relationship: countNonNullSignals(relationshipBaseWithRaw.signals),
        },
        rawInterestsCount: {
          self: selfRawInterests.length,
          partner: partnerRawInterests.length,
          relationship: relationshipRawInterests.length,
        },
        negativePreferencesCount: {
          self: selfNegPrefs.negativePreferences.length,
          partner: partnerNegPrefs.negativePreferences.length,
          relationship: relationshipNegPrefs.negativePreferences.length,
        },
        softNoCount: {
          self: selfNegPrefs.softNo.length,
          partner: partnerNegPrefs.softNo.length,
          relationship: relationshipNegPrefs.softNo.length,
        },
        dealbreakersCount: {
          self: selfNegPrefs.dealbreakers.length,
          partner: partnerNegPrefs.dealbreakers.length,
          relationship: relationshipNegPrefs.dealbreakers.length,
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
        self: selfBaseWithRaw,
        partner: partnerBaseWithRaw,
        relationship: relationshipBaseWithRaw,
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
          rawInterests: RAW_INTERESTS_PROMPT_HASH,
          rawNegativePreferences: RAW_NEGATIVES_PREFS_PROMPT_HASH,
        },
      },
    };
  }
}
