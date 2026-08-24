import type { Logger } from '@nestjs/common';

import { contentToString } from './openai-response-text';

const OPENAI_DEBUG_RAW = process.env.OPENAI_DEBUG_RAW === '1';

/** Debug log response shape and text preview (no keys, headers, or full payload). */
export function debugLogResponse(
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

/** Always-on compact shape log for chat.completions responses (no secrets / full payload). */
export function logOpenAIRawShape(
  completion: unknown,
  requestId: string,
  purpose: string,
  model: string,
  logger: Logger,
): void {
  const res = completion as unknown;
  const ro =
    res && typeof res === 'object'
      ? (res as Record<string, unknown>)
      : undefined;
  const choice0 = ro?.choices?.[0] as Record<string, unknown> | undefined;
  const co = choice0 && typeof choice0 === 'object' ? choice0 : undefined;
  const msg0 =
    co?.message && typeof co.message === 'object'
      ? (co.message as Record<string, unknown>)
      : undefined;
  const toolCalls = msg0?.tool_calls;
  const tool0 =
    Array.isArray(toolCalls) && toolCalls.length > 0 ? toolCalls[0] : undefined;
  const to =
    tool0 && typeof tool0 === 'object'
      ? (tool0 as Record<string, unknown>)
      : undefined;
  const func0 =
    to?.function && typeof to.function === 'object'
      ? (to.function as Record<string, unknown>)
      : undefined;
  const fc =
    msg0?.function_call && typeof msg0.function_call === 'object'
      ? (msg0.function_call as Record<string, unknown>)
      : undefined;
  const msgContent = msg0?.content;
  const shape = {
    topKeys: ro ? Object.keys(ro) : [],
    choices0_keys: co ? Object.keys(co) : [],
    choices0_finish_reason: co?.finish_reason,
    message0_keys: msg0 ? Object.keys(msg0) : [],
    message0_content_preview:
      typeof msgContent === 'string' ? msgContent.slice(0, 200) : undefined,
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
  logger.log(
    JSON.stringify({
      event: 'OPENAI_RAW_SHAPE',
      requestId,
      purpose,
      model,
      shape,
    }),
  );
}
