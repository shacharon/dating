import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ZodError } from 'zod';
import { parseHolyGrailStructuredPreferencesPatchBody } from './retrieval/holy-grail-preferences-patch.schema';
import {
  HolyGrailStructuredWriteError,
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from './holy-grail-structured-write.merge';

/**
 * Sparse partial updates for `MatchmakingProfile` Holy Grail JSON columns.
 * Omit `structuredFactsPatch` / `structuredPreferencesPatch` to leave that column unchanged.
 * Patches must use only `HOLY_GRAIL_STRUCTURED_*_JSON_KEYS` (see `holy-grail-structured-contract.ts`).
 */
export interface HolyGrailStructuredWriteRequest {
  readonly structuredFactsPatch?: Record<string, unknown>;
  /** Parsed as `record<string, unknown>` then merge-validated against persisted preference keys only. */
  readonly structuredPreferencesPatch?: unknown;
}

interface LegacyMatchmakingProfileUpdateInput {
  holyGrailStructuredFacts?: unknown;
  holyGrailStructuredPreferences?: unknown;
}

@Injectable()
export class HolyGrailStructuredWriteService {
  private readonly logger = new Logger(HolyGrailStructuredWriteService.name);

  /**
   * Validates and merges patches into existing JSON. No defaults; unknown keys rejected.
   * Slice 8: no `MatchmakingProfile` read — merges against an empty persisted JSON base (writes still disabled in slice 7).
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

    const row = {
      holyGrailStructuredFacts: null,
      holyGrailStructuredPreferences: null,
    };

    const data: LegacyMatchmakingProfileUpdateInput = {};

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

    if (Object.keys(data).length === 0) {
      return;
    }
    // Slice 7: MatchmakingProfile writes disabled (pre–Migration 4).
    this.logger.warn(
      `[LEGACY] matchmakingProfile.update skipped profileId=${profileId} (slice 7); merged payload not persisted`,
    );
  }
}
