import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { StoryVoiceDraftService } from './story-voice-draft.service';

function audioFile(
  overrides: Partial<{
    mimetype: string;
    size: number;
    buffer: Buffer;
    originalname: string;
  }> = {},
) {
  const buffer = overrides.buffer ?? Buffer.alloc(512, 1);
  return {
    mimetype: overrides.mimetype ?? 'audio/webm',
    size: overrides.size ?? buffer.length,
    buffer,
    originalname: overrides.originalname ?? 'rec.webm',
  };
}

async function expectErrorBody(
  promise: Promise<unknown>,
  status: number,
  error: string,
) {
  try {
    await promise;
    throw new Error('expected rejection');
  } catch (e) {
    expect(e).toBeInstanceOf(HttpException);
    expect((e as HttpException).getStatus()).toBe(status);
    expect((e as HttpException).getResponse()).toMatchObject({ error });
  }
}

describe('StoryVoiceDraftService', () => {
  const rateLimit = { consumeDraftSlot: jest.fn() };
  const moderation = {
    assertProfileEditAllowed: jest.fn(),
    moderateProfileTextFields: jest.fn(),
  };
  const llm = { completeJSON: jest.fn() };
  const openai = { transcribeAudio: jest.fn() };
  const obs = { trace: jest.fn() };

  let service: StoryVoiceDraftService;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimit.consumeDraftSlot.mockResolvedValue(undefined);
    moderation.assertProfileEditAllowed.mockResolvedValue(undefined);
    moderation.moderateProfileTextFields.mockResolvedValue(undefined);
    openai.transcribeAudio.mockResolvedValue({
      text: 'I like hiking and kind partners.',
      language: 'en',
      duration: 42,
    });
    llm.completeJSON.mockResolvedValue({
      value: {
        aboutMe: 'I like hiking.',
        aboutPartner: 'Someone kind.',
        aboutRelationship: 'Long term.',
      },
      rawText: '{}',
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });
    service = new StoryVoiceDraftService(
      rateLimit as never,
      moderation as never,
      llm as never,
      openai as never,
      obs as never,
    );
  });

  it('returns moderated draft without writing profile', async () => {
    const result = await service.createDraftForUser(
      'user_1',
      audioFile(),
      '42',
    );

    expect(result).toMatchObject({
      aboutMe: 'I like hiking.',
      aboutPartner: 'Someone kind.',
      aboutRelationship: 'Long term.',
      language: 'en',
      durationSeconds: 42,
      usage: {
        whisperSeconds: 42,
        chatInputTokens: 100,
        chatOutputTokens: 50,
      },
    });
    expect(rateLimit.consumeDraftSlot).toHaveBeenCalledWith('user_1');
    expect(openai.transcribeAudio).toHaveBeenCalled();
    expect(llm.completeJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        modelKey: 'mini',
        purpose: 'story_voice_draft',
      }),
    );
    expect(moderation.moderateProfileTextFields).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({ aboutMe: 'I like hiking.' }),
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('language=en'),
      ErrorCodes.ME_PROFILE_STORY_VOICE_DRAFT_OK,
    );
    const okLog = (obs.trace as jest.Mock).mock.calls[0][0] as string;
    expect(okLog).not.toContain('hiking');
  });

  it('rejects invalid duration before rate limit / OpenAI', async () => {
    await expectErrorBody(
      service.createDraftForUser('user_1', audioFile(), '2'),
      400,
      'voice_duration_invalid',
    );
    expect(rateLimit.consumeDraftSlot).not.toHaveBeenCalled();
    expect(openai.transcribeAudio).not.toHaveBeenCalled();
  });

  it('rejects missing audio before rate limit', async () => {
    await expectErrorBody(
      service.createDraftForUser('user_1', undefined, '10'),
      400,
      'voice_audio_missing',
    );
    expect(rateLimit.consumeDraftSlot).not.toHaveBeenCalled();
  });

  it('rejects invalid MIME before rate limit', async () => {
    await expectErrorBody(
      service.createDraftForUser(
        'user_1',
        audioFile({ mimetype: 'video/webm' }),
        '10',
      ),
      400,
      'voice_audio_invalid_type',
    );
    expect(rateLimit.consumeDraftSlot).not.toHaveBeenCalled();
  });

  it('maps Whisper failure to 502 voice_transcription_failed', async () => {
    openai.transcribeAudio.mockRejectedValue(new Error('boom'));
    await expectErrorBody(
      service.createDraftForUser('user_1', audioFile(), '10'),
      HttpStatus.BAD_GATEWAY,
      'voice_transcription_failed',
    );
    expect(rateLimit.consumeDraftSlot).toHaveBeenCalled();
    expect(llm.completeJSON).not.toHaveBeenCalled();
  });

  it('maps LLM failure to 502 voice_draft_generation_failed', async () => {
    llm.completeJSON.mockRejectedValue(new Error('bad json'));
    await expectErrorBody(
      service.createDraftForUser('user_1', audioFile(), '10'),
      HttpStatus.BAD_GATEWAY,
      'voice_draft_generation_failed',
    );
  });

  it('does not return draft fields when moderation throws', async () => {
    const modErr = new BadRequestException({
      error: 'content_moderation_failed',
      message: 'bad',
    });
    moderation.moderateProfileTextFields.mockRejectedValue(modErr);

    await expect(
      service.createDraftForUser('user_1', audioFile(), '10'),
    ).rejects.toBe(modErr);
  });

  it('rejects empty Whisper transcript', async () => {
    openai.transcribeAudio.mockResolvedValue({
      text: '   ',
      language: 'he',
    });
    await expectErrorBody(
      service.createDraftForUser('user_1', audioFile(), '10'),
      400,
      'voice_recording_too_short',
    );
    expect(llm.completeJSON).not.toHaveBeenCalled();
  });
});
