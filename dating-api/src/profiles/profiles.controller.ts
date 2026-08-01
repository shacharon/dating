import {
  BadRequestException,
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AdminGuard } from '../admin/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import { EvaluateService } from '../evaluate/evaluate.service';

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
@UseGuards(AuthGuard, AdminGuard)
export class ProfilesController {
  constructor(
    private readonly evaluateService: EvaluateService,
    private readonly logger: SimpleLogger,
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

    return {
      ok: true,
      profileId: id,
      evaluation: result.result,
    };
  }
}
