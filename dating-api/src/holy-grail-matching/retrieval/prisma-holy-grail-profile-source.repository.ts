import { Injectable } from '@nestjs/common';
import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import type { HolyGrailProfileSourceRepository } from './holy-grail-profile-source.repository';

/**
 * Legacy HG profile source. `MatchmakingProfile` reads disabled (slice 8 / pre–Migration 4).
 */
@Injectable()
export class PrismaHolyGrailProfileSourceRepository implements HolyGrailProfileSourceRepository {
  async getMappingInputByProfileId(
    profileId: string,
  ): Promise<HolyGrailProfileMappingInput | null> {
    void profileId;
    return null;
  }

  async listCandidateMappingInputs(args: {
    excludeProfileId: string;
    limit?: number;
  }): Promise<readonly HolyGrailProfileMappingInput[]> {
    void args;
    return [];
  }
}
