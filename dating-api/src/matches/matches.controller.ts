import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import type {
  CompareBodyDto,
  CompareGuardMatchDto,
} from './matches.service';
import type {
  MatchIndexDto,
  MatchRecordDto,
} from './match.types';
import type { RebuildStatsDto } from './match-daemon.service';
import { MatchDaemonService } from './match-daemon.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';
import { computeMatchDetailPairHg } from './match-detail-children-unsure';
import {
  mapMatchRecordToDetailUi,
  type MatchDetailUiDto,
} from './match-detail-ui.mapper';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';

@Controller('api/v1/matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly matchDaemon: MatchDaemonService,
    private readonly prisma: PrismaService,
    private readonly hgPairSnapshotTelemetry: HolyGrailPairSnapshotTelemetryService,
  ) {}

  @Post('rebuild')
  async rebuild(): Promise<{ ok: true; stats: RebuildStatsDto }> {
    const stats = await this.matchDaemon.runOnce();
    return { ok: true, stats };
  }

  @Get('auto')
  async getAuto(): Promise<
    { ok: true; index: MatchIndexDto } | { ok: false; message: string }
  > {
    const index = await this.matchDaemon.getAutoIndex();
    if (!index) {
      return {
        ok: false,
        message:
          'Auto index not built. Call POST /api/v1/matches/rebuild first.',
      };
    }
    return { ok: true, index };
  }

  /**
   * Pairwise legacy engine compare. HG directions run first for optional neutral-signal legacy fallback when
   * self-signals are sparse but mutual HG hard-pass holds; `ProfileExtractionV2` is optional (defaults when absent).
   * Response shape unchanged (`READY` | `NOT_ANALYZED` | `INSUFFICIENT_DATA` + nested `match` fields).
   */
  @Post('compare')
  async compare(@Body() body: CompareBodyDto): Promise<
    | { ok: true; status: 'READY'; matchId: string; match: MatchRecordDto }
    | {
        ok: true;
        status: 'NOT_ANALYZED' | 'INSUFFICIENT_DATA';
        matchId: string;
        message: string;
        match: CompareGuardMatchDto;
      }
  > {
    const aId = body?.aId?.trim();
    const bId = body?.bId?.trim();
    if (!aId || !bId) {
      throw new BadRequestException('aId and bId are required');
    }
    if (aId === bId) {
      throw new BadRequestException('aId and bId must be different');
    }
    try {
      const result = await this.matchesService.compare({ aId, bId });
      if (
        result.status === 'NOT_ANALYZED' ||
        result.status === 'INSUFFICIENT_DATA'
      ) {
        return {
          ok: true,
          status: result.status,
          matchId: result.matchId,
          message: result.match.message,
          match: result.match,
        };
      }
      return {
        ok: true,
        status: 'READY',
        matchId: result.matchId,
        match: result.match,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compare failed';
      if (err && typeof err === 'object' && 'status' in err) throw err;
      throw new BadRequestException(message);
    }
  }

  /**
   * Tombstone: GET /api/v1/matches/top was removed (2026-04-19, no in-repo consumers).
   * Declared before @Get(':id') so NestJS static-segment matching prevents "top" from falling through
   * to the detail handler. Returns explicit 404.
   */
  @Get('top')
  getTopRemoved(): never {
    throw new NotFoundException(
      'GET /api/v1/matches/top has been removed. Use GET /api/v1/me/matches for the active product path.',
    );
  }

  /**
   * Detail body may include the same optional HG triple when valid; `computeMatchDetailPairHg` uses live HG
   * (`resolvePairHgFieldsFromSnapshotClassifications`; pair snapshot table removed in Migration 3).
   * Display score is legacy; `children_unsure` does not reorder lists (`MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1`).
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<MatchDetailUiDto> {
    const ctx = await this.matchesService.getReadyMatchDetailContext(id);
    if (!ctx) {
      throw new NotFoundException('Match not found');
    }
    const { match, rowA, rowB } = ctx;
    const normalized: MatchRecordDto = {
      ...match,
      finalScore: match.finalScore ?? match.overall,
    };
    const { children_unsure, holyGrail, telemetry } =
      await computeMatchDetailPairHg(
        this.prisma,
        normalized.aId,
        normalized.bId,
        { rowA, rowB },
      );
    this.hgPairSnapshotTelemetry.recordDetailResolution(telemetry);
    return mapMatchRecordToDetailUi(normalized, children_unsure, holyGrail);
  }
}
