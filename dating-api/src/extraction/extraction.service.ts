import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import {
  EXTRACTION_SIGNAL_KEYS,
  countNonNullSignals,
  type ExtractedSignals,
  type ExtractionDomain,
  type LLMUsageStats,
} from './extracted-signals.interface';
import { normalizeKeys, normalizeRawExtraction } from './core/extraction-normalization';
import { validateExtraction } from './pipeline/extraction-strict-validation';
import { SYSTEM_PROMPT_HASH } from './prompt/extraction-prompt.builder';
import {
  logEmptyModelTextIfNeeded,
  runFirstLlmExtractionCall,
} from './core/extraction-llm.runner';
import { validateAndClean } from './core/extraction-output.cleaner';
import {
  emptyUsage,
  estimateCost,
  mergeUsage,
  parseOpenAIUsage,
} from './core/extraction-usage';
import {
  buildExtractionPipelineTrace,
  buildRawLlmPersistenceLogPayload,
  toExtractionSnapshot,
} from './pipeline/pipeline-trace';

@Injectable()
export class ExtractionService {
  constructor(
    private readonly llm: LLMRouterService,
    private readonly logger: SimpleLogger,
  ) {}

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
    const { value, rawText, usage } = await runFirstLlmExtractionCall(
      this.llm,
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
    logEmptyModelTextIfNeeded(
      this.logger,
      requestId,
      rawText,
      ExtractionService.name,
    );
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
    let cleaned = validateAndClean(afterAlias, domain, (payload) =>
      this.logger.log(JSON.stringify(payload), ExtractionService.name),
    );
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
