import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  HolyGrailStructuredWriteError,
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from './holy-grail-structured-write.merge';

/**
 * Sparse partial updates for `UserProfile` Holy Grail JSON columns.
 * Omit `structuredFactsPatch` / `structuredPreferencesPatch` to leave that column unchanged.
 */
export interface HolyGrailStructuredWriteRequest {
  readonly structuredFactsPatch?: Record<string, unknown>;
  readonly structuredPreferencesPatch?: Record<string, unknown>;
}

@Injectable()
export class HolyGrailStructuredWriteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates and merges patches into existing JSON. No defaults; unknown keys rejected.
   */
  async mergeStructuredLayers(
    profileId: string,
    request: HolyGrailStructuredWriteRequest,
  ): Promise<void> {
    const hasFacts = request.structuredFactsPatch !== undefined;
    const hasPrefs = request.structuredPreferencesPatch !== undefined;
    if (!hasFacts && !hasPrefs) {
      return;
    }

    const row = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
      select: {
        holyGrailStructuredFacts: true,
        holyGrailStructuredPreferences: true,
      },
    });
    if (!row) {
      throw new NotFoundException(`Profile not found: ${profileId}`);
    }

    const data: Prisma.UserProfileUpdateInput = {};

    try {
      if (hasFacts) {
        data.holyGrailStructuredFacts = mergeHolyGrailStructuredFactsPatch(
          row.holyGrailStructuredFacts,
          request.structuredFactsPatch,
        );
      }
      if (hasPrefs) {
        data.holyGrailStructuredPreferences = mergeHolyGrailStructuredPreferencesPatch(
          row.holyGrailStructuredPreferences,
          request.structuredPreferencesPatch,
        );
      }
    } catch (e) {
      if (e instanceof HolyGrailStructuredWriteError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }

    await this.prisma.userProfile.update({
      where: { id: profileId },
      data,
    });
  }
}
