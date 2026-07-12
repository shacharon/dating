import { Body, Controller, Post } from '@nestjs/common';
import { LegacyBackendAdapter } from '../legacy/legacy-backend.adapter';
import { ContradictionService } from './contradiction.service';
import type {
  ContradictionDetectionResult,
  RawProfileInput,
} from './contradiction.types';

export interface DetectContradictionsBody {
  profileA: RawProfileInput;
  profileB: RawProfileInput;
}

@Controller('api/contradiction')
export class ContradictionController {
  constructor(private readonly legacy: LegacyBackendAdapter) {}

  private get contradiction(): ContradictionService {
    return this.legacy.contradiction;
  }

  @Post('detect')
  async detect(
    @Body() body: DetectContradictionsBody,
  ): Promise<{ ok: true; result: ContradictionDetectionResult }> {
    const result = await this.contradiction.detect(
      body.profileA,
      body.profileB,
    );
    return { ok: true, result };
  }
}
