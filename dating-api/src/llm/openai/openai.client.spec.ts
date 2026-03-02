import { extractTextFromOpenAIResponse } from './openai.client';

describe('extractTextFromOpenAIResponse', () => {
  it('extracts non-empty trimmed text from chat.completions style response', () => {
    const response = {
      choices: [
        {
          message: {
            content: '  {"domain":"self","signals":{}}  ',
          },
        },
      ],
    };
    const text = extractTextFromOpenAIResponse(response);
    expect(text).not.toBe('');
    expect(text).toBe(text.trim());
    expect(text).toContain('"domain":"self"');
  });

  it('extracts non-empty trimmed text from Responses API style (output_text)', () => {
    const response = {
      output_text: '\n{"domain":"partner","signals":{}}\n',
    };
    const text = extractTextFromOpenAIResponse(response);
    expect(text).not.toBe('');
    expect(text).toBe(text.trim());
    expect(text).toContain('"domain":"partner"');
  });

  it('extracts non-empty trimmed text from Responses API style (output[0].content)', () => {
    const response = {
      output: [
        {
          content: [{ type: 'text', text: '  {"domain":"relationship"}  ' }],
        },
      ],
    };
    const text = extractTextFromOpenAIResponse(response);
    expect(text).not.toBe('');
    expect(text).toBe(text.trim());
    expect(text).toContain('"domain":"relationship"');
  });

  it('extracts non-empty trimmed text from legacy style (data.choices[0].message.content)', () => {
    const response = {
      data: {
        choices: [
          {
            message: {
              content: '  {"version":"v1"}  ',
            },
          },
        ],
      },
    };
    const text = extractTextFromOpenAIResponse(response);
    expect(text).not.toBe('');
    expect(text).toBe(text.trim());
    expect(text).toContain('"version":"v1"');
  });
});
