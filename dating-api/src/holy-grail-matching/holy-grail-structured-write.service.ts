import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { parseHolyGrailStructuredPreferencesPatchBody } from './retrieval/holy-grail-preferences-patch.schema';
import {
  HolyGrailStructuredWriteError,
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from './holy-grail-structured-write.merge';

/**
 * Sparse partial updates for `UserProfile` Holy Grail JSON columns.
 * Omit `structuredFactsPatch` / `structuredPreferencesPatch` to leave that column unchanged.
 * Patches must use only `HOLY_GRAIL_STRUCTURED_*_JSON_KEYS` (see `holy-grail-structured-contract.ts`).
 */
export interface HolyGrailStructuredWriteRequest {
  readonly structuredFactsPatch?: Record<string, unknown>;
  /** Parsed as `record<string, unknown>` then merge-validated against persisted preference keys only. */
  readonly structuredPreferencesPatch?: unknown;
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
        const prefsPatch = parseHolyGrailStructuredPreferencesPatchBody(
          request.structuredPreferencesPatch,
        );
        data.holyGrailStructuredPreferences =
          mergeHolyGrailStructuredPreferencesPatch(
            row.holyGrailStructuredPreferences,
            prefsPatch,
          );
      }
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException(e.message);
      }
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
