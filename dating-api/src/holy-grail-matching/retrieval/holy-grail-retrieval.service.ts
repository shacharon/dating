import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { MatchingCanonicalModel } from '../../canonical/matching-canonical.types';
import { mapProfileSourceToMatchingCanonical } from '../profile-to-canonical.mapper';
import {
  rankHolyGrailCandidatesAfterHardFilter,
  type RankedHolyGrailCandidate,
} from '../holy-grail-candidate-ranking';
import {
  HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY,
  type HolyGrailProfileSourceRepository,
} from './holy-grail-profile-source.repository';

export interface HolyGrailRetrievalDebugCounts {
  /** Candidate profiles loaded from the repository (after excluding searcher, before canonical map / filter). */
  readonly retrieved: number;
  /** Candidate rows that failed `mapProfileSourceToMatchingCanonical` (silent skip). */
  readonly canonicalMapFailed: number;
  /** Survivors after pairwise hard eligibility (both directions). */
  readonly passedHardFilter: number;
  /** Rows returned after ranking (same as passed hard filter). */
  readonly ranked: number;
}

export interface HolyGrailRetrievalResponse {
  readonly rankedCandidates: readonly RankedHolyGrailCandidate[];
  readonly debug: HolyGrailRetrievalDebugCounts;
}

function tryMapToCanonical(input: Parameters<typeof mapProfileSourceToMatchingCanonical>[0]): MatchingCanonicalModel | null {
  try {
    return mapProfileSourceToMatchingCanonical(input);
  } catch {
    return null;
  }
}

@Injectable()
export class HolyGrailRetrievalService {
  constructor(
    @Inject(HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY)
    private readonly sources: HolyGrailProfileSourceRepository,
  ) {}

  /**
   * Load searcher + candidate pool from persistence, map to canonical, hard-filter, rank v1.
   * No geo, coordinates, or place IDs. Invalid profile rows that fail mapper validation are skipped.
   */
  async retrieveRankedCandidates(args: {
    readonly searcherProfileId: string;
    readonly limit?: number;
    readonly evaluatedAt?: Date;
  }): Promise<HolyGrailRetrievalResponse> {
    const searcherInput = await this.sources.getMappingInputByProfileId(args.searcherProfileId);
    if (!searcherInput) {
      throw new NotFoundException(`Profile not found: ${args.searcherProfileId}`);
    }
    const searcher = tryMapToCanonical(searcherInput);
    if (!searcher) {
      throw new NotFoundException(`Profile cannot be mapped to canonical model: ${args.searcherProfileId}`);
    }

    const candidateInputs = await this.sources.listCandidateMappingInputs({
      excludeProfileId: args.searcherProfileId,
      limit: args.limit,
    });
    const retrieved = candidateInputs.length;

    const candidates: MatchingCanonicalModel[] = [];
    let canonicalMapFailed = 0;
    for (const input of candidateInputs) {
      const m = tryMapToCanonical(input);
      if (m !== null) {
        candidates.push(m);
      } else {
        canonicalMapFailed += 1;
      }
    }

    const ranked = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates,
      evaluatedAt: args.evaluatedAt,
      includeDebug: true,
    });

    const dbg = ranked.debug;
    const passedHardFilter = dbg?.passedHardFilter ?? 0;
    const rankedCount = dbg?.rankedCount ?? ranked.rankedCandidates.length;

    return {
      rankedCandidates: ranked.rankedCandidates,
      debug: {
        retrieved,
        canonicalMapFailed,
        passedHardFilter,
        ranked: rankedCount,
      },
    };
  }
}
