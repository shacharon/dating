import { Inject, Injectable } from '@nestjs/common';
import {
  MATCH_NARRATIVE_CACHE_REPOSITORY,
  type IMatchNarrativeCacheRepository,
} from '../../me-profile/repositories/match-narrative-cache.repository';

@Injectable()
export class MatchNarrativeCacheService {
  constructor(
    @Inject(MATCH_NARRATIVE_CACHE_REPOSITORY)
    private readonly cache: IMatchNarrativeCacheRepository,
  ) {}

  find(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    promptVersion: string;
  }): Promise<string | null> {
    return this.cache.find(args);
  }

  upsert(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    promptVersion: string;
    narrative: string;
    model?: string | null;
  }): Promise<void> {
    return this.cache.upsert(args);
  }
}
