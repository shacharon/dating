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
import { KEY_ALIASES, normalizeKeys, normalizeRawExtraction } from './extraction-normalization';
import { applySparseTextGuard } from './extraction-sparse-policy';
import { applyTextInference } from './extraction-text-inference';
import { enforceSignalCountLimits } from './extraction-signal-count-policy';
import { computeConfidenceFromCoverage } from './extraction-confidence';

const SIGNAL_KEYS_LIST = EXTRACTION_SIGNAL_KEYS.join(', ');

const EXTRACTOR_SYSTEM_PROMPT = `You are a professional psychological profiler extracting exactly the predefined signals for domains: self, relationship, partner.
Use inference when evidence is specific enough. Prefer a low-confidence score (4–6) over null when weak but real evidence exists.
Only use null when the text provides absolutely no hint for a signal.

DO NOT carelessly double-count the same vibe across many signals. One phrase or theme can support multiple signals when the text clearly justifies it (e.g. "slow life, mindfulness" supports both lifestylePace and spirituality). Avoid assigning the same vague phrase to many signals; prefer 2–3 well-justified signals per phrase over 5–6 weak ones. Generic phrases like "nice", "good people", "positive vibes", "fun" support at most 1–2 low-confidence signals.

EVIDENCE RULES:
- Every non-null score MUST have one evidence item: use a short grounded quote or a short grounded paraphrase from the text.
- Stay grounded in the text; do not invent. Prefer a direct quote when available; a short paraphrase is fine when the text is abstract or indirect.
- If you cannot point to any textual support for a score, use null for that signal.

When cues are strong and specific, do not return empty signals.
Aim for 8–12 non-null signals per profile when reasonable textual evidence exists. Minimum 6 when the text provides any meaningful content.

DO NOT create new keys. Use only EXTRACTION_SIGNAL_KEYS. Unknown keys will be dropped.

Signal meanings (official keys only, 1–10 or null). Use the "distinct from" notes to choose the best-fitting signal; when in doubt, assign the signal that fits best rather than leaving null.

CORE RELATIONSHIP / EMOTIONAL (keep distinct):
- emotionalDepth: how much someone VALUES emotional depth and vulnerability in a relationship (importance of deep feelings, sharing, being open). Distinct from: attachmentSecurity (style of bonding); emotionalDepth is about value, not behavior.
- attachmentSecurity: secure vs anxious/avoidant attachment style; how comfortably they bond and trust. Distinct from: emotionalDepth (value placed on depth); attachment is style of connecting.
- relationshipClarity: clarity about relationship goals and expectations (e.g. long-term, marriage, casual). Distinct from: traditionalism (values/convention); this is what kind of relationship they want.

COMMUNICATION / STYLE:
- directness: how directly someone communicates day-to-day (direct vs indirect, clear vs subtle). Distinct from: conflict behavior (not a signal yet).
- independence: need for autonomy and space; self-sufficiency. Distinct from: socialBattery (social vs alone); independence is about space/autonomy.

LIFESTYLE / PACE:
- socialBattery: preference for social vs solitary time; recharge alone vs with people. Distinct from: lifestylePace (speed of life); socialBattery is quantity of social interaction.
- lifestylePace: slow (low) ↔ fast-paced life (high); busy vs calm. Distinct from: socialBattery; pace is speed/activity level.
- ambition: drive, competitiveness, achievement orientation.

BODY / HEALTH / MONEY / VALUES:
- healthBodyConsciousness: focus on fitness, health, body.
- physicalPriority: importance of physical attraction and appearance.
- financialMindset: attitudes toward money, wealth, material success. (PROTECTED — see cue list below.)
- traditionalism: traditional vs non-traditional values. (PROTECTED — see cue list below.)
- spirituality: importance of meaning, spirituality, inner life.
- statusOrientation: focus on social status, prestige, image. (PROTECTED — see cue list below.)

INFERENCE EXAMPLES (apply when evidence is strong and specific):
1. "respects boundaries" / "needs space" → independence >= 7, directness >= 6
2. "not into heavy partying" / "not a party person" → socialBattery <= 5, lifestylePace <= 6
3. "shared habits" / "supporting growth" / "grow together" → relationshipClarity >= 7
4. "training" / "gym" / "sleep + food discipline" → healthBodyConsciousness >= 8
5. "quiet home" / "no drama" / "homebody" → lifestylePace <= 4
6. "guided by stars" / "retreat" / "meditation" → spirituality >= 8
7. "quiet" / "village" / "nature" / "cats" / "trees" → socialBattery <= 4, lifestylePace <= 4
8. "startup" / "career" / "ambitious" / "driven" → ambition >= 7
9. "clear communication" / "honest" / "direct" → directness >= 7
10. "needs space" / "independence" / "autonomy" → independence >= 7
11. "family oriented" / "long-term" / "serious relationship" → relationshipClarity >= 7
12. "fitness" / "yoga" / "healthy eating" → healthBodyConsciousness >= 7

PRIORITY SIGNALS — always try to score when any textual evidence exists (prefer a low-confidence value over null):
lifestylePace, independence, socialBattery, relationshipClarity, directness, emotionalDepth, healthBodyConsciousness

PROTECTED SIGNALS — NEVER infer unless the text explicitly contains cues from the cue list below. If no cue is present, use null.

- financialMindset — ONLY score when text explicitly mentions at least one of: money, save, saving, spend, spending, invest, investment, wealth, rich, budget, financially, salary, income, cost, afford, debt, frugal, splurge, financial goals, material success.
- statusOrientation — ONLY score when text explicitly mentions at least one of: status, image, prestige, elite, high society, dress code, etiquette, appearance (in social/professional context), class, luxury brand, how we present, social standing, reputation.
- traditionalism — ONLY score when text explicitly mentions at least one of: traditional, tradition, values, family values, kosher, religious, marriage, conventional, conservative (values), ceremony, how we do things, old-fashioned, modern (contrasted with traditional).

WEEK 2 SHADOW SIGNAL (extract when evidence exists; do not use for scoring; 1–10 or null):
- intellectualCuriosity: drive to learn, explore ideas, ask questions, engage with complex topics. Trigger phrases: "curious", "love learning", "read", "books", "deep conversations", "interested in", "explore", "always asking", "intellectual", "discuss ideas". Distinct from: emotionalDepth (value on emotional openness); intellectualCuriosity is about ideas and learning, not feelings.

Return JSON only. No explanations.
Signals (use exactly these keys, integer 1–10 or null): ${SIGNAL_KEYS_LIST}
Evidence: for every non-null score, one item { "signal": "<key>", "quote": "<short grounded quote or paraphrase from the text>" }. Max 18 items.
Confidence: decimal in range 0 to 1 inclusive (0..1). E.g. 0.3, 0.5, 0.8. Do not use values outside 0..1.
Output: { "domain": "self|partner|relationship", "signals": { "<key>": number|null, ... }, "evidence": [...], "confidence": number (0..1), "version": "v1" }
`;

/** Short hash of system prompt for debug logs. */
const SYSTEM_PROMPT_HASH = createHash('sha256')
  .update(EXTRACTOR_SYSTEM_PROMPT)
  .digest('hex')
  .slice(0, 12);

/** Minimal retry prompt when first pass returned empty signals but text has content. */
const EXTRACTOR_RETRY_PROMPT = `Same domain and signal keys. The previous extraction returned no scores. Use inference: from the text below, assign 1-10 to at least 2-3 signals that have any hint. Evidence: short grounded quote or paraphrase from the text per score. JSON only. Confidence must be in range 0..1 (e.g. 0.5). { "domain": "...", "signals": {...}, "evidence": [...], "confidence": 0.5, "version": "v1" }.`;

/** Retry prompt for partner domain when text is short: aim for 2–4 grounded signals, no hallucination. */
const PARTNER_SHORT_RETRY_PROMPT = `Same domain and signal keys. The text is short; extract 2–4 signals that have clear support in the text. Use a short grounded quote or paraphrase for each score. Do not invent; only score when the text gives a real hint. JSON only. Confidence 0..1 (e.g. 0.4). { "domain": "partner", "signals": {...}, "evidence": [...], "confidence": 0.4, "version": "v1" }.`;

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

@Injectable()
export class ExtractionService {
  constructor(
    private readonly llm: LLMRouterService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Build output from allowlist only. Round to int, enforce 1–10 or null. Evidence filtered to official keys; alias rewritten to official.
   */
  private validateAndClean(
    data: ExtractedSignals,
    requestedDomain: ExtractionDomain,
  ): ExtractedSignals {
    let corrected = false;
    const normalizedSignals = data.signals ?? {};
    const evidenceSignals = new Set(
      (data.evidence ?? []).map((e) => {
        const s = String(e.signal).trim();
        return (KEY_ALIASES[s] ?? s) as string;
      }),
    );

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
        if (evidenceSignals.has(key)) {
          const clamped = Math.max(1, Math.min(10, rounded));
          signals[key] = Number.isNaN(clamped) ? 5 : clamped;
          this.logger.debug(
            `validateAndClean kept signal (had evidence) signalName=${key} reason=outOfRange clamped=${signals[key]}`,
          );
        } else {
          const reason = Number.isNaN(rounded) ? 'nan' : 'outOfRange';
          signals[key] = null;
          corrected = true;
          this.logger.log(
            JSON.stringify({
              event: 'validateAndClean_stripped',
              key,
              value,
              reason,
            }),
            ExtractionService.name,
          );
        }
      } else {
        signals[key] = rounded;
      }
    }

    if (data.domain !== requestedDomain) {
      corrected = true;
    }

    let confidence = data.confidence ?? 0.5;

    const evidence = (data.evidence ?? [])
      .map((item) => {
        const s = String(item.signal).trim();
        const officialSignal = KEY_ALIASES[s] ?? s;
        return { ...item, signal: officialSignal };
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
    return { userPrompt, requestId, inputText, inputPreview, extractStart, accUsage };
  }

  /** Stage 2: Run first LLM extraction call. */
  private async runFirstLlmExtractionCall(
    userPrompt: string,
    requestId: string,
  ): Promise<{ value: Record<string, unknown>; rawText: string | null; usage: unknown }> {
    const { value, rawText, usage } = await this.llm.completeJSON<Record<string, unknown>>({
      modelKey: 'fast',
      system: EXTRACTOR_SYSTEM_PROMPT,
      user: userPrompt,
      schema: z.any(),
      temperature: 0.1,
      maxTokens: 5000,
      timeoutMs: 120_000,
      requestId,
      purpose: 'extraction',
    });
    return { value, rawText, usage };
  }

  /** Stage 4: Normalize alias keys and log telemetry. */
  private applyNormalizeAliasKeys(data: ExtractedSignals): ExtractedSignals {
    const { normalizedSignals, telemetry } = normalizeKeys(data.signals);
    this.logger.debug(
      JSON.stringify({
        event: 'normalizeKeys_telemetry',
        aliasesSeen: telemetry.aliasesSeen,
        aliasesMapped: telemetry.aliasesMapped,
        aliasesDroppedBecauseOfficialExists: telemetry.aliasesDroppedBecauseOfficialExists,
        unknownSignalKeysDropped: telemetry.unknownSignalKeysDropped,
      }),
    );
    return { ...data, signals: normalizedSignals };
  }

  /** Stage 6: Optional retry when non-empty text returned zero signals; for partner with short text, also retry when extraction is sparse (≤2 signals). */
  private async runOptionalRetryWhenEmpty(
    domain: ExtractionDomain,
    text: string,
    cleaned: ExtractedSignals,
    accUsage: LLMUsageStats,
  ): Promise<{ cleaned: ExtractedSignals; accUsage: LLMUsageStats; retryRan: boolean }> {
    const textTrimmed = text.trim();
    const nonNullCount = countNonNullSignals(cleaned.signals);
    const isPartnerShort = domain === 'partner' && textTrimmed.length > 0 && textTrimmed.length < 150;
    const shouldRetry =
      textTrimmed.length > 0 &&
      (nonNullCount === 0 || (isPartnerShort && nonNullCount <= 2));
    if (!shouldRetry) {
      return { cleaned, accUsage, retryRan: false };
    }
    const retryPrompt = isPartnerShort ? PARTNER_SHORT_RETRY_PROMPT : EXTRACTOR_RETRY_PROMPT;
    this.logger.debug(
      `extraction ${nonNullCount === 0 ? 'empty' : 'sparse'} for non-empty text domain=${domain} length=${textTrimmed.length}, retrying with ${isPartnerShort ? 'partner-short' : 'minimal'} prompt`,
    );
    this.logger.log(
      `[EXTRACTOR_RETRY_PROMPT]\n${retryPrompt}`,
      ExtractionService.name,
    );
    try {
      const retryPayload = await this.llm.completeJSON<Record<string, unknown>>({
        modelKey: 'fast',
        system: retryPrompt,
        user: `Domain: ${domain}\nText:\n"""\n${textTrimmed}\n"""`,
        schema: z.any(),
        temperature: 0.2,
        maxTokens: 4500,
        timeoutMs: 90_000,
        requestId: randomUUID(),
        purpose: 'extraction-retry',
      });
      const retryParsed = parseOpenAIUsage(retryPayload.usage);
      const mergedUsage = mergeUsage(accUsage, {
        ...retryParsed,
        estimatedCostUSD: estimateCost(retryParsed.promptTokens, retryParsed.completionTokens),
        durationMs: 0,
      });
      const retryNormalized = normalizeRawExtraction(retryPayload.value, domain);
      const retryNorm = normalizeKeys(retryNormalized.signals);
      retryNormalized.signals = retryNorm.normalizedSignals;
      const retryCleaned = this.validateAndClean(retryNormalized, domain);
      const retryNonNull = countNonNullSignals(retryCleaned.signals);
      if (retryNonNull > nonNullCount) {
        this.logger.debug(
          `extraction retry succeeded domain=${domain} nonNullCount=${retryNonNull} (was ${nonNullCount})`,
        );
        return { cleaned: retryCleaned, accUsage: mergedUsage, retryRan: true };
      }
      const note = nonNullCount === 0 ? (cleaned.notes ? `${cleaned.notes}; ` : '') + 'EXTRACTION_EMPTY' : cleaned.notes;
      return {
        cleaned: { ...cleaned, notes: note ?? undefined },
        accUsage: mergedUsage,
        retryRan: true,
      };
    } catch {
      const note = nonNullCount === 0 ? (cleaned.notes ? `${cleaned.notes}; ` : '') + 'EXTRACTION_EMPTY' : cleaned.notes;
      return {
        cleaned: { ...cleaned, notes: note ?? undefined },
        accUsage,
        retryRan: true,
      };
    }
  }

  /** Stage 10: Recompute confidence from coverage and signal count factor. */
  private applyRecomputeConfidence(data: ExtractedSignals): ExtractedSignals {
    return {
      ...data,
      confidence: computeConfidenceFromCoverage(data.signals),
    };
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

  async extract(
    domain: ExtractionDomain,
    text: string,
    profileId?: string,
  ): Promise<ExtractedSignals> {
    const {
      userPrompt,
      requestId,
      extractStart,
      accUsage: initialAccUsage,
    } = this.buildRequestMetadata(domain, text);

    const { value, rawText, usage } = await this.runFirstLlmExtractionCall(
      userPrompt,
      requestId,
    );

    const parsed = parseOpenAIUsage(usage);
    let accUsage = mergeUsage(initialAccUsage, {
      ...parsed,
      estimatedCostUSD: estimateCost(parsed.promptTokens, parsed.completionTokens),
      durationMs: 0,
    });

    const rawModelOutputPreview = (rawText ?? '').trim().slice(0, 120);
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
        event: 'extraction_after_llm',
        domain,
        requestId,
        rawModelOutputPreview,
      }),
      ExtractionService.name,
    );

    const normalized = normalizeRawExtraction(value, domain);
    let cleaned = this.applyNormalizeAliasKeys(normalized);
    cleaned = this.validateAndClean(cleaned, domain);

    const nonNullCount = countNonNullSignals(cleaned.signals);
    this.logger.debug(
      `extract domain=${domain} nonNullCount=${nonNullCount} confidence=${cleaned.confidence}`,
    );

    const retryResult = await this.runOptionalRetryWhenEmpty(
      domain,
      text,
      cleaned,
      accUsage,
    );
    cleaned = retryResult.cleaned;
    accUsage = retryResult.accUsage;

    const finalNonNull = countNonNullSignals(cleaned.signals);
    if (finalNonNull === 0 && text.trim().length > 0) {
      cleaned = {
        ...cleaned,
        notes:
          (cleaned.notes ? `${cleaned.notes}; ` : '') + 'EXTRACTION_EMPTY_DEBUG',
        debug: { rawModelOutput: (rawText ?? '').slice(0, 1000) },
      };
    }

    cleaned = {
      ...cleaned,
      ...applySparseTextGuard(cleaned, text, EXTRACTION_SIGNAL_KEYS),
    };
    cleaned = applyTextInference(cleaned, text);
    cleaned = enforceSignalCountLimits(cleaned, text);

    cleaned = this.applyRecomputeConfidence(cleaned);

    const provenanceStages: string[] = [
      'llm',
      'alias_normalization',
      'validate_and_clean',
    ];
    if (retryResult.retryRan) provenanceStages.push('retry');
    provenanceStages.push('sparse_guard', 'text_inference', 'signal_count_cap');

    const withProvenance: ExtractedSignals = {
      ...cleaned,
      _provenance: { stages: provenanceStages },
    };

    this.logger.debug(
      JSON.stringify({
        event: 'extraction_provenance',
        domain,
        requestId,
        stages: provenanceStages,
      }),
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
    const [self, relationship, partner] = await Promise.all([
      this.extract('self', aboutMe.trim(), profileId),
      this.extract('relationship', aboutRelationship.trim(), profileId),
      this.extract('partner', aboutPartner.trim(), profileId),
    ]);
    const _usage = [self, relationship, partner].reduce(
      (acc, s) => mergeUsage(acc, s._usage ?? emptyUsage()),
      emptyUsage(),
    );
    return { self, relationship, partner, _usage };
  }
}
