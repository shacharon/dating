import type { HolyGrailProfileMappingInput } from '../profile-sources.types';

/**
 * Loads structured DTOs for `mapProfileSourceToMatchingCanonical`.
 * DB / persistence lives in infrastructure implementations only.
 */
export interface HolyGrailProfileSourceRepository {
  getMappingInputByProfileId(profileId: string): Promise<HolyGrailProfileMappingInput | null>;

  /**
   * Other profiles ordered for retrieval (stable). Caller excludes searcher separately if needed.
   * `limit` caps how many ids are returned (pool size before mapping/filter).
   */
  listCandidateMappingInputs(args: {
    excludeProfileId: string;
    limit?: number;
  }): Promise<readonly HolyGrailProfileMappingInput[]>;
}

export const HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY = Symbol('HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY');
