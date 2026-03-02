import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import {
  EXTRACTION_SIGNAL_KEYS,
  type ExtractedSignals,
  type ExtractionDomain,
} from './extracted-signals.interface';

const EXTRACTION_SIGNAL_KEYS_SET = new Set<string>(EXTRACTION_SIGNAL_KEYS);

/** Alias -> official key. emotionalIntimacyPriority not mapped (lossy; skip for now). */
const KEY_ALIASES: Record<string, string> = {
  spiritualOrientation: 'spirituality',
  appearancePriority: 'physicalPriority',
  materialAmbition: 'financialMindset',
  partnerObjectificationRisk: 'physicalPriority',
  instrumentalRelationshipView: 'statusOrientation',
};

const SIGNAL_KEYS_LIST = EXTRACTION_SIGNAL_KEYS.join(', ');

const EXTRACTOR_SYSTEM_PROMPT = `You are a professional psychological profiler extracting exactly the predefined signals for domains: self, relationship, partner.
Use inference when evidence is specific enough. Use null when evidence is generic or ambiguous.
Do not assign many signals from one generic phrase. Generic phrases like "nice", "good people", "positive vibes", "fun" support at most 1-2 low-confidence signals unless stronger context exists.
For every non-null score, include a short direct snippet as evidence (5-15 words).
When cues are strong and specific, do not return empty signals.

DO NOT create new keys. Use only EXTRACTION_SIGNAL_KEYS. Unknown keys will be dropped.

Signal meanings (official keys only, 1–10 or null):
- ambition: drive, competitiveness, achievement orientation.
- socialBattery: preference for social vs solitary time.
- healthBodyConsciousness: focus on fitness, health, body.
- emotionalDepth: importance of emotional depth and vulnerability.
- attachmentSecurity: secure vs anxious/avoidant attachment style.
- directness: direct communication vs indirect.
- independence: need for autonomy and space.
- traditionalism: traditional vs non-traditional values.
- financialMindset: attitudes toward money, wealth, material success.
- relationshipClarity: clarity about relationship goals and expectations.
- spirituality: importance of meaning, spirituality, inner life.
- lifestylePace: slow (low) ↔ fast-paced life (high).
- physicalPriority: importance of physical attraction and appearance.
- statusOrientation: focus on social status, prestige, image.

Return JSON only. No explanations.
Signals (use exactly these keys, integer 1–10 or null): ${SIGNAL_KEYS_LIST}
Evidence: for every non-null score, one item { "signal": "<key>", "quote": "<5-15 word snippet>" }. Max 10 items.
Confidence: 0.3–0.8. Include "version": "v1".
Output: { "domain": "self|partner|relationship", "signals": { "<key>": number|null, ... }, "evidence": [...], "confidence": number, "version": "v1" }
`;

/** Short hash of system prompt for debug logs. */
const SYSTEM_PROMPT_HASH = createHash('sha256')
  .update(EXTRACTOR_SYSTEM_PROMPT)
  .digest('hex')
  .slice(0, 12);

/** Minimal retry prompt when first pass returned empty signals but text has content. */
const EXTRACTOR_RETRY_PROMPT = `Same domain and signal keys. The previous extraction returned no scores. Use inference: from the text below, assign 1-10 to at least 2-3 signals that have any hint. Evidence: short quote (5-15 words) per score. JSON only: { "domain": "...", "signals": {...}, "evidence": [...], "confidence": 0.5, "version": "v1" }.`;

/** Sparse-text guard: max non-null for short text. */
const SPARSE_MAX_NON_NULL = 3;
/** Very generic/short text: stricter cap (max 2 non-null). */
const VERY_SPARSE_MAX_NON_NULL = 2;
/** Sparse-text guard: max confidence when input is sparse. */
const SPARSE_CONFIDENCE_CAP = 0.45;
/** Input is treated as sparse if under this character count (trimmed). */
const SPARSE_INPUT_LENGTH_THRESHOLD = 80;
/** Input is treated as sparse if under this word count. */
const SPARSE_INPUT_WORD_THRESHOLD = 12;
/** Very generic: under this length or word count gets max 2 non-null. */
const VERY_SPARSE_INPUT_LENGTH_THRESHOLD = 50;
const VERY_SPARSE_INPUT_WORD_THRESHOLD = 6;

function isSparseInput(text: string): boolean {
  const t = text.trim();
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  return t.length < SPARSE_INPUT_LENGTH_THRESHOLD || wordCount < SPARSE_INPUT_WORD_THRESHOLD;
}

function isVerySparseInput(text: string): boolean {
  const t = text.trim();
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  return t.length < VERY_SPARSE_INPUT_LENGTH_THRESHOLD || wordCount < VERY_SPARSE_INPUT_WORD_THRESHOLD;
}

/**
 * When input is short/generic, cap non-null signals and confidence. Very generic text: max 2; short: max 3.
 * Deterministic; no extra LLM call.
 */
function applySparseTextGuard(
  data: ExtractedSignals,
  inputText: string,
): ExtractedSignals {
  if (!isSparseInput(inputText)) return data;
  const maxNonNull = isVerySparseInput(inputText) ? VERY_SPARSE_MAX_NON_NULL : SPARSE_MAX_NON_NULL;
  const nonNullKeys = EXTRACTION_SIGNAL_KEYS.filter((k) => data.signals[k] != null);
  if (nonNullKeys.length <= maxNonNull && data.confidence <= SPARSE_CONFIDENCE_CAP)
    return data;

  const signals = { ...data.signals };
  const keepKeys = new Set<string>(nonNullKeys.slice(0, maxNonNull));
  for (const k of EXTRACTION_SIGNAL_KEYS) {
    if (signals[k] != null && !keepKeys.has(k)) signals[k] = null;
  }
  const evidence = (data.evidence ?? []).filter((e) => keepKeys.has(e.signal));
  const confidence = Math.min(data.confidence, SPARSE_CONFIDENCE_CAP);
  return {
    ...data,
    signals,
    evidence,
    confidence,
  };
}

/** Normalize raw LLM JSON so we can run validateAndClean even when schema parse fails. */
function normalizeRawExtraction(
  raw: unknown,
  requestedDomain: ExtractionDomain,
): ExtractedSignals {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  let domain = obj.domain;
  if (Array.isArray(domain)) domain = domain[0];
  const domainStr =
    typeof domain === 'string' && /^(self|partner|relationship)$/i.test(domain)
      ? (domain.toLowerCase() as ExtractionDomain)
      : requestedDomain;

  const signals: Record<string, number | null> = {};
  if (
    obj.signals != null &&
    typeof obj.signals === 'object' &&
    !Array.isArray(obj.signals)
  ) {
    const s = obj.signals as Record<string, unknown>;
    for (const [k, v] of Object.entries(s)) {
      if (typeof k !== 'string') continue;
      if (v === null) signals[k] = null;
      else if (typeof v === 'number' && Number.isFinite(v)) signals[k] = v;
    }
  }

  const evidence: Array<{ signal: string; quote: string; note?: string }> = [];
  if (Array.isArray(obj.evidence)) {
    for (const item of obj.evidence) {
      if (
        item &&
        typeof item === 'object' &&
        'signal' in item &&
        'quote' in item
      ) {
        const signal = String((item as { signal: unknown }).signal);
        const quote = String((item as { quote: unknown }).quote);
        const note =
          typeof (item as { note?: unknown }).note === 'string'
            ? (item as { note: string }).note
            : undefined;
        evidence.push({ signal, quote, ...(note && { note }) });
      }
    }
  }

  const version = typeof obj.version === 'string' ? obj.version : 'v1';
  let confidence = 0.5;
  if (typeof obj.confidence === 'number' && Number.isFinite(obj.confidence)) {
    confidence = obj.confidence;
  } else if (typeof obj.confidence === 'string') {
    const c = Number(obj.confidence);
    if (Number.isFinite(c)) confidence = Math.max(0, Math.min(1, c));
  }
  const notes = typeof obj.notes === 'string' ? obj.notes : undefined;

  return {
    domain: domainStr,
    signals,
    evidence,
    version: version as 'v1',
    confidence,
    notes,
  };
}

export interface NormalizeKeysTelemetry {
  aliasesSeen: string[];
  aliasesMapped: string[];
  aliasesDroppedBecauseOfficialExists: string[];
  unknownSignalKeysDropped: string[];
}

/**
 * Convert legacy/LLM-invented signal keys to official keys. If both alias and official exist, keep official.
 * Only normalizes keys; values are preserved. validateAndClean remains final authority.
 */
function normalizeKeys(
  rawSignals: Record<string, number | null>,
): { normalizedSignals: Record<string, number | null>; telemetry: NormalizeKeysTelemetry } {
  const telemetry: NormalizeKeysTelemetry = {
    aliasesSeen: [],
    aliasesMapped: [],
    aliasesDroppedBecauseOfficialExists: [],
    unknownSignalKeysDropped: [],
  };
  const normalizedSignals: Record<string, number | null> = {};

  for (const [key, value] of Object.entries(rawSignals)) {
    if (EXTRACTION_SIGNAL_KEYS_SET.has(key)) {
      normalizedSignals[key] = value;
    } else if (key in KEY_ALIASES) {
      const officialKey = KEY_ALIASES[key];
      telemetry.aliasesSeen.push(key);
      if (!(officialKey in normalizedSignals)) {
        normalizedSignals[officialKey] = value;
        telemetry.aliasesMapped.push(key);
      } else {
        telemetry.aliasesDroppedBecauseOfficialExists.push(key);
      }
    } else {
      telemetry.unknownSignalKeysDropped.push(key);
    }
  }

  return { normalizedSignals, telemetry };
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
    if (corrected) {
      confidence = Math.max(0, confidence * 0.8);
    }

    const evidence = (data.evidence ?? [])
      .map((item) => {
        const s = String(item.signal).trim();
        const officialSignal = KEY_ALIASES[s] ?? s;
        return { ...item, signal: officialSignal };
      })
      .filter((item) => EXTRACTION_SIGNAL_KEYS_SET.has(item.signal))
      .slice(0, 10);

    return {
      domain: requestedDomain,
      signals,
      evidence,
      version: data.version ?? 'v1',
      confidence,
      notes: data.notes,
    };
  }

  async extract(
    domain: ExtractionDomain,
    text: string,
  ): Promise<ExtractedSignals> {
    const userPrompt = `Domain: ${domain}\nText:\n"""\n${text}\n"""`;
    const requestId = randomUUID();
    const inputText = text;
    const inputPreview = inputText.slice(0, 120);

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

    // Use permissive schema so malformed LLM output doesn't throw; we normalize and validate below.
    const { value, rawText } = await this.llm.completeJSON<
      Record<string, unknown>
    >({
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
    const { normalizedSignals, telemetry } = normalizeKeys(normalized.signals);
    normalized.signals = normalizedSignals;
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
    let cleaned = this.validateAndClean(normalized, domain);

    const nonNullCount = Object.values(cleaned.signals).filter(
      (v) => v != null,
    ).length;
    this.logger.debug(
      `extract domain=${domain} nonNullCount=${nonNullCount} confidence=${cleaned.confidence}`,
    );

    const textTrimmed = text.trim();
    if (textTrimmed.length > 0 && nonNullCount === 0) {
      this.logger.debug(
        `extraction empty for non-empty text domain=${domain} length=${textTrimmed.length}, retrying with minimal inference prompt`,
      );
      this.logger.log(
        `[EXTRACTOR_RETRY_PROMPT]\n${EXTRACTOR_RETRY_PROMPT}`,
        ExtractionService.name,
      );
      try {
        const retryPayload = await this.llm.completeJSON<
          Record<string, unknown>
        >({
          modelKey: 'fast',
          system: EXTRACTOR_RETRY_PROMPT,
          user: `Domain: ${domain}\nText:\n"""\n${textTrimmed}\n"""`,
          schema: z.any(),
          temperature: 0.2,
          maxTokens: 4500,
          timeoutMs: 90_000,
          requestId: randomUUID(),
          purpose: 'extraction-retry',
        });
        const retryNormalized = normalizeRawExtraction(
          retryPayload.value,
          domain,
        );
        const retryNorm = normalizeKeys(retryNormalized.signals);
        retryNormalized.signals = retryNorm.normalizedSignals;
        const retryCleaned = this.validateAndClean(retryNormalized, domain);
        const retryNonNull = Object.values(retryCleaned.signals).filter(
          (v) => v != null,
        ).length;
        if (retryNonNull > 0) {
          cleaned = retryCleaned;
          this.logger.debug(
            `extraction retry succeeded domain=${domain} nonNullCount=${retryNonNull}`,
          );
        } else {
          cleaned = {
            ...cleaned,
            notes:
              (cleaned.notes ? `${cleaned.notes}; ` : '') + 'EXTRACTION_EMPTY',
          };
        }
      } catch {
        cleaned = {
          ...cleaned,
          notes:
            (cleaned.notes ? `${cleaned.notes}; ` : '') + 'EXTRACTION_EMPTY',
        };
      }
    }

    const finalNonNull = Object.values(cleaned.signals).filter(
      (v) => v != null,
    ).length;
    if (finalNonNull === 0 && text.trim().length > 0) {
      cleaned = {
        ...cleaned,
        notes:
          (cleaned.notes ? `${cleaned.notes}; ` : '') +
          'EXTRACTION_EMPTY_DEBUG',
        debug: { rawModelOutput: (rawText ?? '').slice(0, 1000) },
      };
    }

    cleaned = applySparseTextGuard(cleaned, text);
    return cleaned;
  }

  /** Run all three domain extractions in parallel. */
  async extractAllThree(
    aboutMe: string,
    aboutRelationship: string,
    aboutPartner: string,
  ): Promise<{
    self: ExtractedSignals;
    relationship: ExtractedSignals;
    partner: ExtractedSignals;
  }> {
    const [self, relationship, partner] = await Promise.all([
      this.extract('self', aboutMe.trim()),
      this.extract('relationship', aboutRelationship.trim()),
      this.extract('partner', aboutPartner.trim()),
    ]);
    return { self, relationship, partner };
  }
}
