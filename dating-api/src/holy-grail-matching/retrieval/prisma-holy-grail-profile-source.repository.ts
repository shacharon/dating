import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import type { HolyGrailProfileSourceRepository } from './holy-grail-profile-source.repository';
import { buildHolyGrailProfileMappingInputFromDbRow } from './holy-grail-structured-db-json';

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
      include: { extractionV2: { select: EXTRACTION_SELECT } },
    });
    if (!row) return null;
    return buildHolyGrailProfileMappingInputFromDbRow({
      profileId: row.id,
      extractionV2: row.extractionV2,
      holyGrailStructuredFacts: row.holyGrailStructuredFacts,
      holyGrailStructuredPreferences: row.holyGrailStructuredPreferences,
    });
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
      include: { extractionV2: { select: EXTRACTION_SELECT } },
    });
    return rows.map((row) =>
      buildHolyGrailProfileMappingInputFromDbRow({
        profileId: row.id,
        extractionV2: row.extractionV2,
        holyGrailStructuredFacts: row.holyGrailStructuredFacts,
        holyGrailStructuredPreferences: row.holyGrailStructuredPreferences,
      }),
    );
  }
}
