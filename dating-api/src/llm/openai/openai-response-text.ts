/** Safe shape dump for raw SDK response: top-level keys + candidate field previews (no secrets, no full payload). */
export function summarizeOpenAIResponse(res: unknown): Record<string, unknown> {
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
export function contentToString(c: unknown): string {
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

/**
 * Remove leading/trailing Markdown code fences so JSON.parse succeeds when models wrap output in ```json ... ```.
 */
function stripMarkdownCodeFences(text: string): string {
  let s = text.trim();
  if (!s) return s;
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z0-9_+-]*\s*\r?\n?/, '');
    s = s.replace(/\r?\n?```\s*$/, '');
  }
  return s.trim();
}

/** Parse JSON from model text: strip fences, then parse; on failure, try substring between outermost { }. */
export function parseModelJsonText(rawText: string): unknown {
  const s = stripMarkdownCodeFences(rawText || '');
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
    const i = s.indexOf('{');
    const j = s.lastIndexOf('}');
    if (i !== -1 && j > i) {
      return JSON.parse(s.slice(i, j + 1));
    }
    throw e;
  }
}
