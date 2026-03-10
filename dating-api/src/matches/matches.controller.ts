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
  CompareNotAnalyzedMatchDto,
  MatchListItemDto,
} from './matches.service';
import type { MatchIndexDto, MatchRecordDto } from './match.types';
import type { RebuildStatsDto } from './match-daemon.service';
import { MatchDaemonService } from './match-daemon.service';
import { MatchesService } from './matches.service';

@Controller('api/v1/matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly matchDaemon: MatchDaemonService,
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
    | { ok: true; status: 'NOT_ANALYZED'; matchId: string; message: string; match: CompareNotAnalyzedMatchDto }
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
      if (result.status === 'NOT_ANALYZED') {
        return {
          ok: true,
          status: 'NOT_ANALYZED',
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

  @Get(':id')
  async getById(@Param('id') id: string): Promise<{ ok: true; match: MatchRecordDto }> {
    const match = await this.matchesService.getById(id);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    const normalized: MatchRecordDto = {
      ...match,
      finalScore: match.finalScore ?? match.overall,
    };
    return { ok: true, match: normalized };
  }
}
