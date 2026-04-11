/**
 * Raw LLM logging + extraction pipeline stage diffs (observability only).
 */

import {
  EXTRACTION_SIGNAL_KEYS,
  countNonNullSignals,
  type ExtractionDomain,
  type ExtractionPipelineTrace,
  type ExtractionSnapshot,
  type ExtractionStageDiff,
  type ExtractedSignals,
} from './extracted-signals.interface';

export const PIPELINE_TRACE_PARSED_JSON_LOG_MAX = 48_000;
export const PIPELINE_TRACE_RAW_TEXT_LOG_MAX = 16_000;

export function toExtractionSnapshot(e: ExtractedSignals): ExtractionSnapshot {
  return {
    domain: e.domain,
    signals: { ...e.signals },
    evidence: e.evidence.map((x) => ({ ...x })),
    confidence: e.confidence,
  };
}

function officialSignalDiff(
  a: Record<string, number | null>,
  b: Record<string, number | null>,
): string[] {
  const changed: string[] = [];
  for (const k of EXTRACTION_SIGNAL_KEYS) {
    if (a[k] !== b[k]) changed.push(k);
  }
  return changed;
}

export function diffExtractionSnapshots(
  from: ExtractionSnapshot,
  to: ExtractionSnapshot,
  fromStage: string,
  toStage: string,
): ExtractionStageDiff {
  return {
    fromStage,
    toStage,
    signalKeysWithChangedValues: officialSignalDiff(from.signals, to.signals),
    nonNullSignalsBefore: countNonNullSignals(from.signals),
    nonNullSignalsAfter: countNonNullSignals(to.signals),
    evidenceCountBefore: from.evidence.length,
    evidenceCountAfter: to.evidence.length,
    confidenceBefore: from.confidence,
    confidenceAfter: to.confidence,
  };
}

export function buildExtractionStageDiffs(
  stages: Array<{ name: string; snapshot: ExtractionSnapshot }>,
): ExtractionStageDiff[] {
  const out: ExtractionStageDiff[] = [];
  for (let i = 1; i < stages.length; i++) {
    out.push(
      diffExtractionSnapshots(
        stages[i - 1].snapshot,
        stages[i].snapshot,
        stages[i - 1].name,
        stages[i].name,
      ),
    );
  }
  return out;
}

export function safeJsonClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

export interface RawLlmLogFields {
  rawTextCharLength: number;
  rawTextPreview: string;
  parsedJsonString: string;
  parsedJsonStringTruncated: boolean;
}

export function buildRawLlmLogFields(
  parsedJson: unknown,
  rawText: string | null | undefined,
): RawLlmLogFields {
  let parsedJsonString = '';
  try {
    parsedJsonString = JSON.stringify(parsedJson);
  } catch {
    parsedJsonString = '"[unserializable]"';
  }
  const parsedJsonStringTruncated =
    parsedJsonString.length > PIPELINE_TRACE_PARSED_JSON_LOG_MAX;
  if (parsedJsonStringTruncated) {
    parsedJsonString =
      parsedJsonString.slice(0, PIPELINE_TRACE_PARSED_JSON_LOG_MAX) +
      '…[truncated]';
  }
  const rt = rawText ?? '';
  const rawTextCharLength = rt.length;
  const rawTextPreview =
    rt.length > PIPELINE_TRACE_RAW_TEXT_LOG_MAX
      ? rt.slice(0, PIPELINE_TRACE_RAW_TEXT_LOG_MAX) + '…[truncated]'
      : rt;
  return {
    rawTextCharLength,
    rawTextPreview,
    parsedJsonString,
    parsedJsonStringTruncated,
  };
}

export function buildRawLlmPersistenceLogPayload(
  base: Record<string, unknown>,
  parsedJson: unknown,
  rawText: string | null | undefined,
): Record<string, unknown> {
  return {
    ...base,
    event: 'raw_llm_output_before_alias_normalization',
    ...buildRawLlmLogFields(parsedJson, rawText),
  };
}

export function buildExtractionPipelineTrace(params: {
  pipeline: 'extraction_v1' | 'extraction_v2_base';
  domain: ExtractionDomain;
  requestId: string;
  profileId?: string;
  parsedJson: unknown;
  rawText: string | null | undefined;
  stageSnapshots: Array<{ name: string; snapshot: ExtractionSnapshot }>;
}): ExtractionPipelineTrace {
  const rt = params.rawText ?? '';
  const rawTextCharLength = rt.length;
  const rawTextPreview =
    rt.length > PIPELINE_TRACE_RAW_TEXT_LOG_MAX
      ? rt.slice(0, PIPELINE_TRACE_RAW_TEXT_LOG_MAX) + '…[truncated]'
      : rt;
  return {
    pipeline: params.pipeline,
    domain: params.domain,
    requestId: params.requestId,
    ...(params.profileId !== undefined ? { profileId: params.profileId } : {}),
    rawLlmOutput: {
      parsedJson: safeJsonClone(params.parsedJson),
      rawTextPreview,
      rawTextCharLength,
    },
    stageDiffs: buildExtractionStageDiffs(params.stageSnapshots),
  };
}
