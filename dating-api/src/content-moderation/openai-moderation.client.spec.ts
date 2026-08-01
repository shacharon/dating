import {
  isContentModerationEnabled,
  MODERATION_INPUT_MAX_CHARS,
  pickPrimaryCategory,
} from './content-moderation.types';
import { OpenAIModerationClient } from './openai-moderation.client';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import { ErrorCodes } from '../logging/error-codes';

describe('isContentModerationEnabled', () => {
  it('defaults to true when unset', () => {
    expect(isContentModerationEnabled({})).toBe(true);
  });

  it('treats false/0/off/no as disabled', () => {
    expect(isContentModerationEnabled({ CONTENT_MODERATION_ENABLED: 'false' })).toBe(
      false,
    );
    expect(isContentModerationEnabled({ CONTENT_MODERATION_ENABLED: '0' })).toBe(
      false,
    );
    expect(isContentModerationEnabled({ CONTENT_MODERATION_ENABLED: 'off' })).toBe(
      false,
    );
  });
});

describe('pickPrimaryCategory', () => {
  it('prefers flagged category with highest score', () => {
    const { primaryCategory, score } = pickPrimaryCategory(
      { sexual: 0.9, hate: 0.2 },
      ['sexual'],
    );
    expect(primaryCategory).toBe('sexual');
    expect(score).toBe(0.9);
  });
});

describe('OpenAIModerationClient', () => {
  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;

  class TestClient extends OpenAIModerationClient {
    public createMock = jest.fn();
    protected createSdkClient() {
      return {
        moderations: { create: this.createMock },
      } as never;
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns clean result for empty text without calling API', async () => {
    const client = new TestClient(obs);
    const result = await client.checkContent('   ');
    expect(result.flagged).toBe(false);
    expect(result.failOpen).toBe(false);
    expect(client.createMock).not.toHaveBeenCalled();
  });

  it('maps flagged moderation response', async () => {
    const client = new TestClient(obs);
    // Force api key path by stubbing createSdkClient only — constructor already loaded env.
    // If env has no key, inject via prototype: override check by setting apiKey
    (client as unknown as { apiKey: string }).apiKey = 'sk-test';
    client.createMock.mockResolvedValue({
      results: [
        {
          flagged: true,
          categories: { sexual: true, hate: false },
          category_scores: { sexual: 0.95, hate: 0.01 },
        },
      ],
    });

    const result = await client.checkContent('explicit text');
    expect(result.flagged).toBe(true);
    expect(result.categories).toEqual(['sexual']);
    expect(result.primaryCategory).toBe('sexual');
    expect(result.score).toBe(0.95);
    expect(result.sexualScore).toBe(0.95);
    expect(result.failOpen).toBe(false);
  });

  it('fail-opens on API error', async () => {
    const client = new TestClient(obs);
    (client as unknown as { apiKey: string }).apiKey = 'sk-test';
    client.createMock.mockRejectedValue(new Error('network'));

    const result = await client.checkContent('hello');
    expect(result.flagged).toBe(false);
    expect(result.failOpen).toBe(true);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('fail-open'),
      ErrorCodes.CONTENT_MODERATION_FAIL_OPEN,
    );
  });

  it('truncates long input before API call', async () => {
    const client = new TestClient(obs);
    (client as unknown as { apiKey: string }).apiKey = 'sk-test';
    client.createMock.mockResolvedValue({
      results: [
        {
          flagged: false,
          categories: {},
          category_scores: {},
        },
      ],
    });

    const long = 'x'.repeat(MODERATION_INPUT_MAX_CHARS + 500);
    await client.checkContent(long);
    expect(client.createMock).toHaveBeenCalledWith(
      { input: 'x'.repeat(MODERATION_INPUT_MAX_CHARS) },
      expect.objectContaining({ timeout: 5000 }),
    );
  });

  it('fail-opens when API key missing', async () => {
    const client = new TestClient(obs);
    (client as unknown as { apiKey: string }).apiKey = '';
    const result = await client.checkContent('hello');
    expect(result.failOpen).toBe(true);
    expect(client.createMock).not.toHaveBeenCalled();
  });
});
