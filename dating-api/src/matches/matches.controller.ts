import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import type { CompareBodyDto, CompareGuardMatchDto, MatchListItemDto } from './matches.service';
import type { MatchIndexDto, MatchRecordDto } from './match.types';
import type { RebuildStatsDto } from './match-daemon.service';
import { MatchDaemonService } from './match-daemon.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';
import { computeMatchDetailChildrenUnsure } from './match-detail-children-unsure';
import { mapMatchRecordToDetailUi, type MatchDetailUiDto } from './match-detail-ui.mapper';

/** UI-friendly match preview for /dating/matches list. */
export interface DatingMatchPreviewDto {
  id: string;
  name: string;
  age: number;
  summary: string;
  compatibilityScore: number;
  strongReason: string;
  frictionPoint: string;
  explainability?: {
    positiveChips: string[];
    tensionChip?: string;
    reasonShort: string;
  };
  recommendation?: {
    explainability: {
      positiveChips: string[];
      tensionChip?: string;
      reasonShort: string;
    };
    primaryTakeaway: string;
    caution?: string;
    suggestedNextAction: string;
  };
}

@Controller('api/v1/matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly matchDaemon: MatchDaemonService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('rebuild')
  async rebuild(): Promise<{ ok: true; stats: RebuildStatsDto }> {
    const stats = await this.matchDaemon.runOnce();
    return { ok: true, stats };
  }

  @Get('auto')
  async getAuto(): Promise<{ ok: true; index: MatchIndexDto } | { ok: false; message: string }> {
    const index = await this.matchDaemon.getAutoIndex();
    if (!index) {
      return { ok: false, message: 'Auto index not built. Call POST /api/v1/matches/rebuild first.' };
    }
    return { ok: true, index };
  }

  @Post('compare')
  async compare(
    @Body() body: CompareBodyDto,
  ): Promise<
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
      if (result.status === 'NOT_ANALYZED' || result.status === 'INSUFFICIENT_DATA') {
        return {
          ok: true,
          status: result.status,
          matchId: result.matchId,
          message: result.match.message,
          match: result.match,
        };
      }
      return { ok: true, status: 'READY', matchId: result.matchId, match: result.match };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compare failed';
      if (err && typeof err === 'object' && 'status' in err) throw err;
      throw new BadRequestException(message);
    }
  }

  @Get()
  async list(): Promise<{ ok: true; items: MatchListItemDto[] }> {
    const items = await this.matchesService.list();
    return { ok: true, items };
  }

  @Get('top')
  async getTop(): Promise<{ ok: true; matches: DatingMatchPreviewDto[] }> {
    const items = await this.matchesService.list();
    const sorted = items
      .map((item) => {
        const finalScore = item.finalScore ?? item.overall;
        const otherPerson = item.b;
        const chips = item.explainability?.positiveChips?.slice(0, 5) ?? [];
        
        const preview: DatingMatchPreviewDto = {
          id: item.matchId,
          name: otherPerson.name,
          age: 30,
          summary: `Match score: ${finalScore}`,
          compatibilityScore: Math.round(finalScore),
          strongReason: item.shortReason || 'Good compatibility',
          frictionPoint: item.explainability?.tensionChip || 'No major tensions',
          ...(item.explainability && { explainability: item.explainability }),
          ...(item.recommendation && { recommendation: item.recommendation }),
        };
        return preview;
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 20);
    return { ok: true, matches: sorted };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<MatchDetailUiDto> {
    const match = await this.matchesService.getById(id);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    const normalized: MatchRecordDto = {
      ...match,
      finalScore: match.finalScore ?? match.overall,
    };
    const children_unsure = await computeMatchDetailChildrenUnsure(
      this.prisma,
      normalized.aId,
      normalized.bId,
    );
    return mapMatchRecordToDetailUi(normalized, children_unsure);
  }
}
