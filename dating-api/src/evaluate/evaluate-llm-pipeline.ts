/**
 * Evaluate-time LLM traces (summary, motivation, traits) — observability only.
 */

import {
  PIPELINE_TRACE_RAW_TEXT_LOG_MAX,
  buildRawLlmLogFields,
  safeJsonClone,
} from '../extraction/pipeline-trace';

export interface EvaluateJsonStageDiff {
  fromStage: string;
  toStage: string;
  changedKeys: string[];
}

export interface EvaluateLlmCallTrace {
  purpose: string;
  requestId: string;
  rawLlmOutput: {
    parsedJson: unknown;
    rawTextPreview: string;
    rawTextCharLength: number;
  };
  stageDiffs: EvaluateJsonStageDiff[];
}

function topLevelChangedKeys(before: unknown, after: unknown): string[] {
  if (!before || typeof before !== 'object' || Array.isArray(before)) return [];
  if (!after || typeof after !== 'object' || Array.isArray(after)) return [];
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed.push(k);
  }
  return changed.sort();
}

export function buildEvaluateRawLlmLogPayload(
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

export function buildEvaluateLlmTrace(params: {
  purpose: string;
  requestId: string;
  parsedJson: unknown;
  rawText: string | null | undefined;
  afterStages: Array<{ name: string; value: unknown }>;
}): EvaluateLlmCallTrace {
  const rt = params.rawText ?? '';
  const rawTextCharLength = rt.length;
  const rawTextPreview =
    rt.length > PIPELINE_TRACE_RAW_TEXT_LOG_MAX
      ? rt.slice(0, PIPELINE_TRACE_RAW_TEXT_LOG_MAX) + '…[truncated]'
      : rt;
  const stageDiffs: EvaluateJsonStageDiff[] = [];
  let prev: unknown = params.parsedJson;
  let prevName = 'after_llm';
  for (const st of params.afterStages) {
    stageDiffs.push({
      fromStage: prevName,
      toStage: st.name,
      changedKeys: topLevelChangedKeys(prev, st.value),
    });
    prev = st.value;
    prevName = st.name;
  }
  return {
    purpose: params.purpose,
    requestId: params.requestId,
    rawLlmOutput: {
      parsedJson: safeJsonClone(params.parsedJson),
      rawTextPreview,
      rawTextCharLength,
    },
    stageDiffs,
  };
}
