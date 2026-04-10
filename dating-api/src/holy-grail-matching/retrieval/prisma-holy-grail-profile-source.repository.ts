import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import type { HolyGrailProfileSourceRepository } from './holy-grail-profile-source.repository';
import { buildHolyGrailProfileMappingInputFromRankingAwareDbRow } from './holy-grail-structured-db-json';
import { HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT } from '../holy-grail-ranking-signal-self.select';

const DEFAULT_CANDIDATE_POOL_LIMIT = 500;

const EXTRACTION_SELECT = {
  interests_self: true,
  interests: true,
  lifestyleTraits: true,
} as const;

@Injectable()
export class PrismaHolyGrailProfileSourceRepository implements HolyGrailProfileSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMappingInputByProfileId(profileId: string): Promise<HolyGrailProfileMappingInput | null> {
    const row = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
      include: {
        extractionV2: { select: EXTRACTION_SELECT },
        signalSnapshots: { where: { domain: 'self' }, select: HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT },
      },
    });
    if (!row) return null;
    return buildHolyGrailProfileMappingInputFromRankingAwareDbRow(row);
  }

  async listCandidateMappingInputs(args: {
    excludeProfileId: string;
    limit?: number;
  }): Promise<readonly HolyGrailProfileMappingInput[]> {
    const take = args.limit !== undefined ? Math.max(0, args.limit) : DEFAULT_CANDIDATE_POOL_LIMIT;
    const rows = await this.prisma.userProfile.findMany({
      where: { id: { not: args.excludeProfileId } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: take === 0 ? 0 : take,
      include: {
        extractionV2: { select: EXTRACTION_SELECT },
        signalSnapshots: { where: { domain: 'self' }, select: HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT },
      },
    });
    return rows.map((row) => buildHolyGrailProfileMappingInputFromRankingAwareDbRow(row));
  }
}
