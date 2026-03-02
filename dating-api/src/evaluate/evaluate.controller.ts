import {
  BadRequestException,
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SimpleLogger } from '../logger/simple-logger.service';
import type {
  EvaluateBatchInput,
  EvaluateBatchResult,
} from './evaluate.service';
import { EvaluateService } from './evaluate.service';

export interface EvaluateBatchBodyDto {
  aboutMe: string;
  aboutRelationship: string;
  aboutPartner: string;
  modelKey?: string;
  temperature?: number;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Evaluation failed';
}

@Controller('api/evaluate')
export class EvaluateController {
  constructor(
    private readonly evaluateService: EvaluateService,
    private readonly logger: SimpleLogger,
  ) {}

  @Post('batch')
  async evaluateBatch(
    @Body() body: EvaluateBatchBodyDto,
  ): Promise<{ ok: true; result: EvaluateBatchResult }> {
    this.logger.log('EVALUATE BATCH CALLED', 'EvaluateController');
    const aboutMe = body?.aboutMe?.trim();
    const aboutRelationship = body?.aboutRelationship?.trim();
    const aboutPartner = body?.aboutPartner?.trim();
    if (!aboutMe || !aboutRelationship || !aboutPartner) {
      throw new BadRequestException(
        'aboutMe, aboutRelationship and aboutPartner are required and must be non-empty',
      );
    }
    const input: EvaluateBatchInput = {
      aboutMe,
      aboutRelationship,
      aboutPartner,
      modelKey: body.modelKey,
      temperature: body.temperature,
    };
    type SuccessResult = { ok: true; result: EvaluateBatchResult };
    let result: SuccessResult;
    try {
      result = await this.evaluateService.evaluateBatch(input);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message.startsWith('Unknown LLM modelKey:')) {
        throw new BadRequestException(message);
      }
      throw new ServiceUnavailableException(message);
    }
    return result;
  }
}
