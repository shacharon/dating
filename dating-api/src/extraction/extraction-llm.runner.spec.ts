import {
  logEmptyModelTextIfNeeded,
  runFirstLlmExtractionCall,
} from './extraction-llm.runner';
import { getSystemPromptForDomain } from './extraction-prompt.builder';

describe('extraction-llm.runner (sprint-58 story 2)', () => {
  it('runFirstLlmExtractionCall passes fast model + domain system prompt', async () => {
    const completeJSON = jest.fn().mockResolvedValue({
      value: { domain: 'self', signals: {} },
      rawText: '{}',
      usage: {},
    });
    const llm = { completeJSON } as never;

    const result = await runFirstLlmExtractionCall(
      llm,
      'self',
      'Domain: self\nText:\n"""\nhi\n"""',
      'req-1',
      2,
    );

    expect(result.value).toEqual({ domain: 'self', signals: {} });
    expect(completeJSON).toHaveBeenCalledTimes(1);
    const arg = completeJSON.mock.calls[0][0];
    expect(arg.modelKey).toBe('fast');
    expect(arg.purpose).toBe('extraction');
    expect(arg.requestId).toBe('req-1');
    expect(arg.system).toBe(getSystemPromptForDomain('self'));
    expect(arg.latencyStage).toBeUndefined();
  });

  it('partner call includes extraction_partner latencyStage', async () => {
    const completeJSON = jest.fn().mockResolvedValue({
      value: {},
      rawText: null,
      usage: {},
    });
    await runFirstLlmExtractionCall(
      { completeJSON } as never,
      'partner',
      'user',
      'req-2',
      42,
    );
    const arg = completeJSON.mock.calls[0][0];
    expect(arg.latencyStage).toBe('extraction_partner');
    expect(arg.inputTextLength).toBe(42);
  });

  it('logEmptyModelTextIfNeeded logs EMPTY_MODEL_TEXT only when raw empty', () => {
    const log = jest.fn();
    logEmptyModelTextIfNeeded({ log }, 'rid', '  content  ');
    expect(log).not.toHaveBeenCalled();

    logEmptyModelTextIfNeeded({ log }, 'rid', '   ', 'ExtractionService');
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      event: 'EMPTY_MODEL_TEXT',
      requestId: 'rid',
      purpose: 'extraction',
    });
    expect(log.mock.calls[0][1]).toBe('ExtractionService');
  });
});
