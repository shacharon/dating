import {
  BadRequestException,
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import { EvaluateService } from '../evaluate/evaluate.service';
import { ProfilesPrismaService } from './profiles-prisma.service';
import { ExtractionV2PersistenceService } from '../extraction/extraction-v2-persistence.service';

export interface ProfilesEvaluateBodyDto {
  id?: string;
  name: string;
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
}

export interface ProfilesEvaluateResponseDto {
  ok: true;
  profileId: string;
  evaluation: EvaluateBatchResult;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Evaluation failed';
}

@Controller('api/v1/profiles')
export class ProfilesController {
  constructor(
    private readonly evaluateService: EvaluateService,
    private readonly profilesStorage: ProfilesPrismaService,
    private readonly logger: SimpleLogger,
    private readonly extractionV2Persistence: ExtractionV2PersistenceService,
  ) {}

  @Post('evaluate')
  async evaluate(
    @Body() body: ProfilesEvaluateBodyDto,
  ): Promise<ProfilesEvaluateResponseDto> {
    this.logger.log('PROFILES EVALUATE CALLED', 'ProfilesController');

    const name = body?.name?.trim();
    const aboutMe = body?.aboutMe?.trim();
    const aboutPartner = body?.aboutPartner?.trim();
    const aboutRelationship = body?.aboutRelationship?.trim();

    if (!name) {
      throw new BadRequestException('name is required and must be non-empty');
    }
    if (!aboutMe || !aboutPartner || !aboutRelationship) {
      throw new BadRequestException(
        'aboutMe, aboutPartner and aboutRelationship are required and must be non-empty',
      );
    }

    const id = body?.id?.trim() || randomUUID();

    let result: { ok: true; result: EvaluateBatchResult };
    try {
      result = await this.evaluateService.evaluateBatch({
        aboutMe,
        aboutPartner,
        aboutRelationship,
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message.startsWith('Unknown LLM modelKey:')) {
        throw new BadRequestException(message);
      }
      throw new ServiceUnavailableException(message);
    }

    const evaluation = result.result;

    try {
      await this.profilesStorage.save(id, {
        id,
        name,
        texts: {
          aboutMe,
          aboutPartner,
          aboutRelationship,
        },
        evaluation,
      });
      // LEGACY_RETIREMENT_PLAN.md Slice 1: ProfileExtractionV2 writes removed (2026-04-24)
      // await this.extractionV2Persistence.saveExtendedSignalsFromEvaluation({
      //   profileId: id,
      //   aboutMe,
      //   aboutPartner,
      //   aboutRelationship,
      //   evaluation,
      // });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save profile';
      throw new ServiceUnavailableException(message);
    }

    return {
      ok: true,
      profileId: id,
      evaluation,
    };
  }
}
