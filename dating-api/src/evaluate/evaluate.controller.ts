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
  RelationshipMotivationResult,
  AttractionResult,
  AttractionTraitsResult,
} from './evaluate.service';
import type { LifestyleConflictsResult } from '../compatibility/lifestyle-conflicts';
import { EvaluateService } from './evaluate.service';

export interface EvaluateBatchBodyDto {
  aboutMe: string;
  aboutRelationship: string;
  aboutPartner: string;
  modelKey?: string;
  temperature?: number;
}

/** Body for attraction inference: only aboutMe and aboutPartner. */
export interface EvaluateAttractionBodyDto {
  aboutMe: string;
  aboutPartner: string;
}

/** Body for lifestyle conflicts: two signal maps (profileA, profileB). */
export interface EvaluateConflictsBodyDto {
  signalsA: Record<string, number | null>;
  signalsB: Record<string, number | null>;
}

/** Body for attraction-traits: aboutPartner required; aboutMe, aboutRelationship optional. */
export interface EvaluateAttractionTraitsBodyDto {
  aboutPartner: string;
  aboutMe?: string;
  aboutRelationship?: string;
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

  /**
   * Infer primary relationship motivation from aboutMe, aboutPartner, aboutRelationship.
   * Returns JSON: { relationshipMotivation, confidence, evidence }.
   */
  @Post('motivation')
  async inferMotivation(
    @Body() body: EvaluateBatchBodyDto,
  ): Promise<{ ok: true; result: RelationshipMotivationResult }> {
    const aboutMe = body?.aboutMe?.trim();
    const aboutRelationship = body?.aboutRelationship?.trim();
    const aboutPartner = body?.aboutPartner?.trim();
    if (!aboutMe || !aboutRelationship || !aboutPartner) {
      throw new BadRequestException(
        'aboutMe, aboutRelationship and aboutPartner are required and must be non-empty',
      );
    }
    let result: RelationshipMotivationResult;
    try {
      result = await this.evaluateService.inferRelationshipMotivation(
        aboutMe,
        aboutPartner,
        aboutRelationship,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Motivation inference failed';
      if (message.startsWith('Unknown LLM modelKey:')) {
        throw new BadRequestException(message);
      }
      throw new ServiceUnavailableException(message);
    }
    return { ok: true, result };
  }

  /**
   * Infer what attracts this person from aboutMe and aboutPartner (ideal partner description).
   * Returns JSON: { attractionProfile: { ambition, appearance, kindness, status, stability }, confidence, evidence }.
   */
  @Post('attraction')
  async inferAttraction(
    @Body() body: EvaluateAttractionBodyDto,
  ): Promise<{ ok: true; result: AttractionResult }> {
    const aboutMe = body?.aboutMe?.trim();
    const aboutPartner = body?.aboutPartner?.trim();
    if (!aboutMe || !aboutPartner) {
      throw new BadRequestException(
        'aboutMe and aboutPartner are required and must be non-empty',
      );
    }
    let result: AttractionResult;
    try {
      result = await this.evaluateService.inferAttractionProfile(
        aboutMe,
        aboutPartner,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Attraction inference failed';
      if (message.startsWith('Unknown LLM modelKey:')) {
        throw new BadRequestException(message);
      }
      throw new ServiceUnavailableException(message);
    }
    return { ok: true, result };
  }

  /**
   * Infer attraction traits (9 dimensions) from aboutPartner; optional aboutMe/aboutRelationship.
   * Returns JSON: { attraction: { ambition, statusOrientation, ... }, confidence, evidence: [{ dimension, quote }] }.
   */
  @Post('attraction-traits')
  async inferAttractionTraits(
    @Body() body: EvaluateAttractionTraitsBodyDto,
  ): Promise<{ ok: true; result: AttractionTraitsResult }> {
    const aboutPartner = body?.aboutPartner?.trim();
    if (!aboutPartner) {
      throw new BadRequestException(
        'aboutPartner is required and must be non-empty',
      );
    }
    const aboutMe = body?.aboutMe?.trim();
    const aboutRelationship = body?.aboutRelationship?.trim();
    let result: AttractionTraitsResult;
    try {
      result = await this.evaluateService.inferAttractionTraits(
        aboutPartner,
        aboutMe || undefined,
        aboutRelationship || undefined,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Attraction traits inference failed';
      if (message.startsWith('Unknown LLM modelKey:')) {
        throw new BadRequestException(message);
      }
      throw new ServiceUnavailableException(message);
    }
    return { ok: true, result };
  }

  /**
   * Detect structural lifestyle conflicts between two profiles' signals.
   * Returns JSON: { conflicts: string[], severity: 0-10 }.
   */
  @Post('conflicts')
  async detectConflicts(
    @Body() body: EvaluateConflictsBodyDto,
  ): Promise<{ ok: true; result: LifestyleConflictsResult }> {
    const signalsA = body?.signalsA;
    const signalsB = body?.signalsB;
    if (
      !signalsA ||
      !signalsB ||
      typeof signalsA !== 'object' ||
      typeof signalsB !== 'object'
    ) {
      throw new BadRequestException(
        'signalsA and signalsB are required and must be objects',
      );
    }
    const result = this.evaluateService.detectLifestyleConflicts(
      signalsA,
      signalsB,
    );
    return { ok: true, result };
  }
}
