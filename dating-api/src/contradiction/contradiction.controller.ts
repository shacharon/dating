import { Body, Controller, Post } from '@nestjs/common';
import { ContradictionService } from './contradiction.service';
import type { ContradictionDetectionResult, RawProfileInput } from './contradiction.types';

export interface DetectContradictionsBody {
  profileA: RawProfileInput;
  profileB: RawProfileInput;
}

@Controller('api/contradiction')
export class ContradictionController {
  constructor(private readonly contradiction: ContradictionService) {}

  @Post('detect')
  async detect(
    @Body() body: DetectContradictionsBody,
  ): Promise<{ ok: true; result: ContradictionDetectionResult }> {
    const result = await this.contradiction.detect(body.profileA, body.profileB);
    return { ok: true, result };
  }
}
