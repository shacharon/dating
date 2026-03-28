import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ZodError } from 'zod';

import type { CompleteJSONArgs } from '../interfaces/llm-client';
import type { CompleteJSONResult } from '../interfaces/llm-client';
import type { LLMClient } from '../interfaces/llm-client';
import type { LLMConfig } from '../llm.config';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 4096;
const OPENAI_DEBUG_RAW = process.env.OPENAI_DEBUG_RAW === '1';
type LatencyStage = 'extraction_partner' | 'eval_traits';

interface FetchTiming {
  tOpenaiRequestSent: number;
  tFirstByte: number;
}

interface StageLatencySnapshot {
  stage: LatencyStage;
  totalMs: number;
  ttfbMs: number;
  generationMs: number;
  promptTokens: number;
  completionTokens: number;
  tokens: number;
  inputSize: number;
}

/** Safe shape dump for raw SDK response: top-level keys + candidate field previews (no secrets, no full payload). */
function summarizeOpenAIResponse(res: unknown): Record<string, unknown> {
  const obj =
    res && typeof res === 'object' ? (res as Record<string, unknown>) : {};
  const topKeys = Object.keys(obj);
  const shape: Record<string, unknown> = { topKeys };

  const outputText = obj.output_text;
  if (outputText !== undefined) {
    shape.output_text_preview =
      typeof outputText === 'string' ? outputText.slice(0, 120) : undefined;
    shape.output_text_type = typeof outputText;
  }

  const output0 = Array.isArray(obj.output)
    ? (obj.output[0] as Record<string, unknown> | undefined)
    : undefined;
  if (output0 !== undefined && typeof output0 === 'object') {
    const o0 = output0;
    shape.output0_type = o0.type !== undefined ? typeof o0.type : undefined;
    const content0 = Array.isArray(o0.content)
      ? (o0.content as unknown[])[0]
      : undefined;
    if (content0 !== undefined && typeof content0 === 'object') {
      const c0 = content0 as Record<string, unknown>;
      shape.output0_content0_type =
        c0.type !== undefined ? typeof c0.type : undefined;
    }
    const output0Text =
      typeof o0.content === 'string'
        ? o0.content
        : Array.isArray(o0.content)
          ? (o0.content as unknown[])
            .map((p) =>
              p &&
                typeof p === 'object' &&
                typeof (p as { text?: unknown }).text === 'string'
                ? (p as { text: string }).text
                : '',
            )
            .join('')
          : '';
    if (output0Text !== '') {
      shape.output0_content_text_preview = output0Text.slice(0, 120);
      shape.output0_content_text_type = typeof output0Text;
    }
  }

  const choice0 = Array.isArray(obj.choices)
    ? (obj.choices as unknown[])[0]
    : undefined;
  if (choice0 !== undefined && typeof choice0 === 'object') {
    const c0 = choice0 as Record<string, unknown>;
    if (c0.text !== undefined) {
      shape.choices0_text_preview =
        typeof c0.text === 'string' ? c0.text.slice(0, 120) : undefined;
      shape.choices0_text_type = typeof c0.text;
    }
    const msg = c0.message;
    if (msg !== undefined && typeof msg === 'object') {
      const content = (msg as Record<string, unknown>).content;
      if (content !== undefined) {
        shape.choices0_message_content_type = typeof content;
        const msgText =
          typeof content === 'string'
            ? content
            : Array.isArray(content)
              ? (content as unknown[])
                .map((p) =>
                  p &&
                    typeof p === 'object' &&
                    typeof (p as { text?: unknown }).text === 'string'
                    ? (p as { text: string }).text
                    : '',
                )
                .join('')
              : '';
        shape.choices0_message_content_preview =
          typeof msgText === 'string' ? msgText.slice(0, 120) : msgText;
      }
    }
  }

  return shape;
}

/** Turn content (string or array of parts with .text) into a single string. */
function contentToString(c: unknown): string {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .map((p) =>
        p &&
          typeof p === 'object' &&
          typeof (p as { text?: unknown }).text === 'string'
          ? (p as { text: string }).text
          : '',
      )
      .join('');
  }
  return '';
}

/**
 * Get text from a message: content, then tool_calls[0].function.arguments, then function_call.arguments.
 */
function getMessageText(msg: Record<string, unknown> | undefined): string {
  if (!msg || typeof msg !== 'object') return '';
  // 1. Normal text response
  const content = msg.content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  // 2. New tool_calls format
  const toolCalls = msg.tool_calls;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const first = toolCalls[0];
    const fn =
      first && typeof first === 'object'
        ? (first as Record<string, unknown>).function
        : undefined;
    const args =
      fn && typeof fn === 'object'
        ? (fn as Record<string, unknown>).arguments
        : undefined;
    if (typeof args === 'string' && args.trim()) return args.trim();
  }
  // 3. Legacy function_call format
  const fc = msg.function_call;
  if (fc && typeof fc === 'object') {
    const args = (fc as Record<string, unknown>).arguments;
    if (typeof args === 'string' && args.trim()) return args.trim();
  }
  return '';
}

/**
 * Extract model text from common OpenAI SDK / API response shapes.
 * Uses first non-empty string (after trim) from known locations.
 * Handles message.content, message.tool_calls[0].function.arguments, message.function_call.arguments.
 */
export function extractTextFromOpenAIResponse(response: unknown): string {
  const obj =
    response && typeof response === 'object'
      ? (response as Record<string, unknown>)
      : {};
  const output0 =
    Array.isArray(obj.output) &&
      obj.output.length > 0 &&
      typeof obj.output[0] === 'object'
      ? (obj.output[0] as Record<string, unknown>).content
      : undefined;
  const choice0 =
    Array.isArray(obj.choices) &&
      obj.choices.length > 0 &&
      typeof obj.choices[0] === 'object'
      ? (obj.choices[0] as Record<string, unknown>)
      : undefined;
  const msg =
    choice0?.message && typeof choice0.message === 'object'
      ? (choice0.message as Record<string, unknown>)
      : undefined;
  const messageText = getMessageText(msg);
  const deltaContent =
    choice0?.delta && typeof choice0.delta === 'object'
      ? (choice0.delta as Record<string, unknown>).content
      : undefined;
  const dataChoices = (obj.data as Record<string, unknown>)?.choices as
    | unknown[]
    | undefined;
  const dataChoices0 =
    Array.isArray(dataChoices) &&
      dataChoices.length > 0 &&
      typeof dataChoices[0] === 'object'
      ? (dataChoices[0] as Record<string, unknown>)
      : undefined;
  const dataMsg =
    dataChoices0?.message && typeof dataChoices0.message === 'object'
      ? (dataChoices0.message as Record<string, unknown>)
      : undefined;
  const dataMessageText = getMessageText(dataMsg);

  const candidates: string[] = [
    typeof obj.output_text === 'string' ? obj.output_text : '',
    contentToString(output0),
    messageText,
    contentToString(deltaContent),
    dataMessageText,
  ];
  for (const s of candidates) {
    const t = (s ?? '').toString().trim();
    if (t.length > 0) return t;
  }
  return '';
}

/** Debug log response shape and text preview (no keys, headers, or full payload). */
function debugLogResponse(
  response: unknown,
  requestId: string,
  purpose: string,
  logger: Logger,
): void {
  if (!OPENAI_DEBUG_RAW) return;
  const obj =
    response && typeof response === 'object'
      ? (response as Record<string, unknown>)
      : {};
  const topKeys = Object.keys(obj);
  const choice0 =
    Array.isArray(obj.choices) && obj.choices.length > 0
      ? (obj.choices[0] as Record<string, unknown>)
      : undefined;
  const output0 =
    Array.isArray(obj.output) && obj.output.length > 0
      ? (obj.output[0] as Record<string, unknown>)
      : undefined;
  const choice0Keys =
    choice0 && typeof choice0 === 'object'
      ? Object.keys(choice0 as object)
      : [];
  const output0Keys =
    output0 && typeof output0 === 'object'
      ? Object.keys(output0 as object)
      : [];
  const previews: string[] = [];
  if (typeof obj.output_text === 'string') {
    previews.push(`output_text: ${obj.output_text.slice(0, 300)}`);
  }
  const outContent =
    output0 && typeof output0 === 'object' ? output0.content : undefined;
  if (outContent !== undefined) {
    previews.push(
      `output[0].content: ${contentToString(outContent).slice(0, 300)}`,
    );
  }
  const msg =
    choice0 && typeof choice0 === 'object' ? choice0.message : undefined;
  const msgContent =
    msg && typeof msg === 'object'
      ? (msg as Record<string, unknown>).content
      : undefined;
  if (msgContent !== undefined) {
    previews.push(
      `choices[0].message.content: ${contentToString(msgContent).slice(0, 300)}`,
    );
  }
  const delta =
    choice0 && typeof choice0 === 'object' ? choice0.delta : undefined;
  const deltaContent =
    delta && typeof delta === 'object'
      ? (delta as Record<string, unknown>).content
      : undefined;
  if (deltaContent !== undefined) {
    previews.push(
      `choices[0].delta.content: ${contentToString(deltaContent).slice(0, 300)}`,
    );
  }
  logger.log(
    `[OPENAI_DEBUG_RAW] requestId=${requestId} purpose=${purpose} topKeys=[${topKeys.join(',')}] choice0Keys=[${choice0Keys.join(',')}] output0Keys=[${output0Keys.join(',')}] previews=${JSON.stringify(previews)}`,
  );
}

@Injectable()
export class OpenAIClient implements LLMClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private readonly client: OpenAI;
  private readonly fetchTimingByRequestId = new Map<string, FetchTiming>();
  private readonly stageSnapshots = new Map<LatencyStage, StageLatencySnapshot>();

  constructor(private readonly config: LLMConfig) {
    const baseFetch: typeof fetch = (...args) => fetch(...args);
    const instrumentedFetch = async (input: unknown, init?: unknown) => {
      const requestHeaders = new Headers(
        (init &&
        typeof init === 'object' &&
        'headers' in init
          ? (init as { headers?: HeadersInit }).headers
          : undefined) ?? {},
      );
      const requestId =
        requestHeaders.get('x-request-id') ??
        requestHeaders.get('x-codex-request-id');
      const sentAt = Date.now();
      const response = await baseFetch(input as Parameters<typeof fetch>[0], init as Parameters<typeof fetch>[1]);
      const firstByteAt = Date.now();
      if (requestId) {
        this.fetchTimingByRequestId.set(requestId, {
          tOpenaiRequestSent: sentAt,
          tFirstByte: firstByteAt,
        });
      }
      return response;
    };
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
      fetch: instrumentedFetch as typeof fetch,
    });
  }

  async completeJSON<T>(
    args: CompleteJSONArgs<T>,
  ): Promise<CompleteJSONResult<T>> {
    const {
      system,
      user,
      schema,
      model,
      temperature = 0.2,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      maxTokens = DEFAULT_MAX_TOKENS,
      requestId,
      purpose,
      latencyStage,
      inputTextLength,
    } = args;

    const run = async (): Promise<CompleteJSONResult<T>> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // No response_format: with GPT-5 series it can leave message.content empty.
        // Prompt already asks for JSON; model returns it in message.content without it.
        const completion = await this.client.chat.completions.create(
          {
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            max_completion_tokens: maxTokens,
            // temperature omitted: this model only supports default (1).
          },
          {
            signal: controller.signal,
            headers: {
              'x-request-id': requestId,
              'x-codex-request-id': requestId,
            },
          },
        );

        clearTimeout(timeout);

        //   if (process.env.OPENAI_DEBUG_RAW === '1') {
        const res = completion as unknown;
        const ro =
          res && typeof res === 'object'
            ? (res as Record<string, unknown>)
            : undefined;
        const choice0 = ro?.choices?.[0] as
          | Record<string, unknown>
          | undefined;
        const co =
          choice0 && typeof choice0 === 'object'
            ? choice0
            : undefined;
        const msg0 = co?.message && typeof co.message === 'object' ? (co.message as Record<string, unknown>) : undefined;
        const toolCalls = msg0?.tool_calls;
        const tool0 = Array.isArray(toolCalls) && toolCalls.length > 0 ? toolCalls[0] : undefined;
        const to = tool0 && typeof tool0 === 'object' ? (tool0 as Record<string, unknown>) : undefined;
        const func0 = to?.function && typeof to.function === 'object' ? (to.function as Record<string, unknown>) : undefined;
        const fc = msg0?.function_call && typeof msg0.function_call === 'object' ? (msg0.function_call as Record<string, unknown>) : undefined;
        const msgContent = msg0?.content;
        const shape = {
          topKeys: ro ? Object.keys(ro) : [],
          choices0_keys: co ? Object.keys(co) : [],
          choices0_finish_reason: co?.finish_reason,
          message0_keys: msg0 ? Object.keys(msg0) : [],
          message0_content_preview:
            typeof msgContent === 'string'
              ? msgContent.slice(0, 200)
              : undefined,
          tool_calls_len: Array.isArray(toolCalls) ? toolCalls.length : 0,
          tool0_keys: to ? Object.keys(to) : [],
          tool0_func_keys: func0 ? Object.keys(func0) : [],
          tool0_args_preview:
            typeof func0?.arguments === 'string'
              ? func0.arguments.slice(0, 300)
              : undefined,
          function_call_keys: fc ? Object.keys(fc) : [],
          function_call_args_preview:
            typeof fc?.arguments === 'string' ? fc.arguments.slice(0, 300) : undefined,
        };
        this.logger.log(
          JSON.stringify({
            event: 'OPENAI_RAW_SHAPE',
            requestId,
            purpose,
            model,
            shape,
          }),
        );
        //   }
        debugLogResponse(completion, requestId, purpose, this.logger);
        const rawText = extractTextFromOpenAIResponse(completion);
        const value = schema.parse(JSON.parse(rawText || '{}'));
        const usage = (completion as { usage?: unknown }).usage;

        return { value, rawText, usage };
      } finally {
        clearTimeout(timeout);
      }
    };

    const start = Date.now();
    try {
      let result: CompleteJSONResult<T>;
      try {
        result = await run();
      } catch (err) {
        const isSchemaError =
          err instanceof ZodError || err instanceof SyntaxError;
        if (isSchemaError && temperature > 0) {
          result = await run();
        } else {
          throw err;
        }
      }
      const end = Date.now();
      const latencyMs = end - start;
      const usageObj = (result.usage as
        | {
            prompt_tokens?: unknown;
            completion_tokens?: unknown;
            total_tokens?: unknown;
          }
        | undefined) ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const promptTokens =
        typeof usageObj.prompt_tokens === 'number' ? usageObj.prompt_tokens : 0;
      const completionTokens =
        typeof usageObj.completion_tokens === 'number'
          ? usageObj.completion_tokens
          : 0;
      const totalTokens =
        typeof usageObj.total_tokens === 'number'
          ? usageObj.total_tokens
          : promptTokens + completionTokens;
      const fetchTiming = this.fetchTimingByRequestId.get(requestId);
      const tOpenaiRequestSent = fetchTiming?.tOpenaiRequestSent ?? start;
      const tFirstByte = fetchTiming?.tFirstByte ?? end;
      const ttfbMs = Math.max(0, tFirstByte - tOpenaiRequestSent);
      const generationMs = Math.max(0, end - tFirstByte);
      const stage = latencyStage;
      const isTargetStage = stage === 'extraction_partner' || stage === 'eval_traits';

      if (isTargetStage) {
        this.logger.log(
          JSON.stringify({
            event: 'llm_timing_breakdown',
            stage,
            requestId,
            purpose,
            model,
            t_request_start: new Date(start).toISOString(),
            t_openai_request_sent: new Date(tOpenaiRequestSent).toISOString(),
            t_first_byte: new Date(tFirstByte).toISOString(),
            t_response_end: new Date(end).toISOString(),
            total_duration_ms: latencyMs,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            input_text_length: inputTextLength ?? user.length,
            system_prompt_length: system.length,
            temperature,
            max_tokens: maxTokens,
          }),
        );
        this.logger.log(
          JSON.stringify({
            event: 'llm_latency_breakdown',
            stage,
            totalMs: latencyMs,
            ttfbMs,
            generationMs,
            tokens: totalTokens,
            inputSize: inputTextLength ?? user.length,
          }),
        );

        this.stageSnapshots.set(stage, {
          stage,
          totalMs: latencyMs,
          ttfbMs,
          generationMs,
          promptTokens,
          completionTokens,
          tokens: totalTokens,
          inputSize: inputTextLength ?? user.length,
        });

        const extraction = this.stageSnapshots.get('extraction_partner');
        const traits = this.stageSnapshots.get('eval_traits');
        if (extraction && traits) {
          const largerPromptStage =
            extraction.promptTokens >= traits.promptTokens
              ? 'extraction_partner'
              : 'eval_traits';
          const longerGenerationStage =
            extraction.generationMs >= traits.generationMs
              ? 'extraction_partner'
              : 'eval_traits';
          const networkDelta = Math.abs(extraction.ttfbMs - traits.ttfbMs);
          const generationDelta = Math.abs(
            extraction.generationMs - traits.generationMs,
          );
          const promptDelta = Math.abs(
            extraction.promptTokens - traits.promptTokens,
          );
          let bottleneck = 'mixed';
          if (networkDelta > generationDelta && networkDelta > 250) {
            bottleneck = 'network_or_upstream_queue';
          } else if (
            longerGenerationStage === largerPromptStage &&
            promptDelta > 80
          ) {
            bottleneck = 'payload_size_or_model_compute';
          } else if (generationDelta > 250) {
            bottleneck = 'model_generation';
          }

          this.logger.log(
            JSON.stringify({
              event: 'llm_latency_comparison',
              extraction_partner: extraction,
              eval_traits: traits,
              largerPromptStage,
              longerServerProcessingStage: longerGenerationStage,
              detectedDelaySource: bottleneck,
            }),
          );
          this.stageSnapshots.clear();
        }
      }

      this.fetchTimingByRequestId.delete(requestId);
      this.logger.log(
        `requestId=${requestId} purpose=${purpose} model=${model} provider=openai latencyMs=${latencyMs} ok=true`,
      );
      return result;
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.logger.log(
        `requestId=${requestId} purpose=${purpose} model=${model} provider=openai latencyMs=${latencyMs} ok=false`,
      );
      this.fetchTimingByRequestId.delete(requestId);
      throw err;
    }
  }
}
