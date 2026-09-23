import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { OPENAI_LLM_CLIENT } from '../../llm/llm.constants';
import { LLMRouterService } from '../../llm/llm-router.service';
import { OpenAIClient } from '../../llm/openai/openai.client';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { ProfileModerationService } from './profile-moderation.service';
import { StoryVoiceDraftRateLimitService } from './story-voice-draft-rate-limit.service';
import {
  STORY_VOICE_MAX_BYTES,
  STORY_VOICE_MAX_DURATION_SECONDS,
  STORY_VOICE_MIN_DURATION_SECONDS,
  isAllowedStoryVoiceMime,
} from './story-voice-draft.constants';
import type {
  StoryVoiceDraftResponseDto,
  UploadedStoryVoiceFile,
} from './story-voice-draft.dto';

const draftSchema = z.object({
  aboutMe: z.string(),
  aboutPartner: z.string(),
  aboutRelationship: z.string(),
});

function chatTokenPair(usage: unknown): {
  chatInputTokens: number;
  chatOutputTokens: number;
} {
  if (!usage || typeof usage !== 'object') {
    return { chatInputTokens: 0, chatOutputTokens: 0 };
  }
  const u = usage as {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    input_tokens?: unknown;
    output_tokens?: unknown;
  };
  const input =
    typeof u.prompt_tokens === 'number'
      ? u.prompt_tokens
      : typeof u.input_tokens === 'number'
        ? u.input_tokens
        : 0;
  const output =
    typeof u.completion_tokens === 'number'
      ? u.completion_tokens
      : typeof u.output_tokens === 'number'
        ? u.output_tokens
        : 0;
  return { chatInputTokens: input, chatOutputTokens: output };
}

@Injectable()
export class StoryVoiceDraftService {
  private readonly logger = new Logger(StoryVoiceDraftService.name);

  constructor(
    private readonly rateLimit: StoryVoiceDraftRateLimitService,
    private readonly moderation: ProfileModerationService,
    private readonly llm: LLMRouterService,
    @Inject(OPENAI_LLM_CLIENT) private readonly openai: OpenAIClient,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async createDraftForUser(
    userId: string,
    file: UploadedStoryVoiceFile | undefined,
    durationSecondsRaw: unknown,
  ): Promise<StoryVoiceDraftResponseDto> {
    await this.moderation.assertProfileEditAllowed(userId);

    const durationSeconds = this.parseDuration(durationSecondsRaw);
    this.validateFile(file);
    const audio = file as UploadedStoryVoiceFile;

    await this.rateLimit.consumeDraftSlot(userId);

    const requestId = randomUUID();
    const started = Date.now();

    let transcriptText: string;
    let language: string;
    let whisperSeconds: number;

    try {
      const transcription = await this.openai.transcribeAudio({
        buffer: audio.buffer,
        filename: audio.originalname?.trim() || 'recording.webm',
        mimetype: audio.mimetype,
        requestId,
      });
      transcriptText = transcription.text?.trim() ?? '';
      language = (transcription.language ?? 'en').trim() || 'en';
      whisperSeconds =
        typeof transcription.duration === 'number' &&
        Number.isFinite(transcription.duration)
          ? Math.round(transcription.duration)
          : durationSeconds;
    } catch {
      this.logger.warn(
        `requestId=${requestId} purpose=story_voice_whisper ok=false`,
      );
      throw new HttpException(
        {
          error: 'voice_transcription_failed',
          message: 'Could not transcribe the recording. Try again or type instead.',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!transcriptText) {
      throw new BadRequestException({
        error: 'voice_recording_too_short',
        message: 'Recording was too short to transcribe. Speak a bit longer or type instead.',
      });
    }

    let draft: z.infer<typeof draftSchema>;
    let usageRaw: unknown;
    try {
      const result = await this.llm.completeJSON({
        modelKey: 'mini',
        requestId,
        purpose: 'story_voice_draft',
        schema: draftSchema,
        system: [
          'You shape a spoken dating-profile monologue into three short written fields.',
          'Return JSON only with keys aboutMe, aboutPartner, aboutRelationship.',
          'Write in the same language the speaker used (language code given).',
          'Use first person. Preserve the speaker meaning. Do not invent biography.',
          'Split content across the three fields when the monologue covers them.',
          'If a topic was not spoken, use an empty string for that field — prefer empty over fabrication.',
        ].join(' '),
        user: [
          `Spoken language code: ${language}`,
          'Transcript follows (do not quote this label in the output):',
          transcriptText,
        ].join('\n\n'),
        maxTokens: 1200,
        inputTextLength: transcriptText.length,
      });
      draft = result.value;
      usageRaw = result.usage;
    } catch {
      this.logger.warn(
        `requestId=${requestId} purpose=story_voice_draft ok=false`,
      );
      throw new HttpException(
        {
          error: 'voice_draft_generation_failed',
          message: 'Could not create a draft from your recording. Try again or type instead.',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Moderation before return — never return unmoderated draft text.
    await this.moderation.moderateProfileTextFields(userId, {
      aboutMe: draft.aboutMe || null,
      aboutPartner: draft.aboutPartner || null,
      aboutRelationship: draft.aboutRelationship || null,
    });

    const tokens = chatTokenPair(usageRaw);
    const latencyMs = Date.now() - started;
    this.obs.trace(
      `me profile story voice-draft ok userId=${userId} durationSeconds=${durationSeconds} language=${language} whisperSeconds=${whisperSeconds} chatIn=${tokens.chatInputTokens} chatOut=${tokens.chatOutputTokens} latencyMs=${latencyMs}`,
      ErrorCodes.ME_PROFILE_STORY_VOICE_DRAFT_OK,
    );

    return {
      aboutMe: draft.aboutMe,
      aboutPartner: draft.aboutPartner,
      aboutRelationship: draft.aboutRelationship,
      language,
      durationSeconds,
      usage: {
        whisperSeconds,
        chatInputTokens: tokens.chatInputTokens,
        chatOutputTokens: tokens.chatOutputTokens,
      },
    };
  }

  private parseDuration(raw: unknown): number {
    const n =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number.parseInt(raw, 10)
          : NaN;
    if (
      !Number.isFinite(n) ||
      n < STORY_VOICE_MIN_DURATION_SECONDS ||
      n > STORY_VOICE_MAX_DURATION_SECONDS
    ) {
      throw new BadRequestException({
        error: 'voice_duration_invalid',
        message: `Recording must be between ${STORY_VOICE_MIN_DURATION_SECONDS} and ${STORY_VOICE_MAX_DURATION_SECONDS} seconds.`,
      });
    }
    return n;
  }

  private validateFile(file: UploadedStoryVoiceFile | undefined): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        error: 'voice_audio_missing',
        message: 'Attach a multipart file field named "audio".',
      });
    }
    if (file.size > STORY_VOICE_MAX_BYTES) {
      throw new BadRequestException({
        error: 'voice_audio_too_large',
        message: 'Audio file is too large.',
      });
    }
    if (!isAllowedStoryVoiceMime(file.mimetype || '')) {
      throw new BadRequestException({
        error: 'voice_audio_invalid_type',
        message: 'Unsupported audio type.',
      });
    }
    if (file.buffer.length < 256) {
      throw new BadRequestException({
        error: 'voice_recording_too_short',
        message: 'Recording was too short to transcribe. Speak a bit longer or type instead.',
      });
    }
  }
}
