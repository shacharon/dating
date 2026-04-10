import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { CompareBodyDto, CompareGuardMatchDto, MatchListItemDto } from './matches.service';
import type { ChildrenUnsureDirectionsDto, MatchIndexDto, MatchRecordDto } from './match.types';
import type { RebuildStatsDto } from './match-daemon.service';
import { MatchDaemonService } from './match-daemon.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';
import { computeMatchDetailChildrenUnsure } from './match-detail-children-unsure';
import { mapMatchRecordToDetailUi, type MatchDetailUiDto } from './match-detail-ui.mapper';
import {
  ChildrenUnsureAnalyticsService,
  type ChildrenUnsureDailySummary,
} from './children-unsure-analytics.service';
import {
  CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_CLICK,
  CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_IMPRESSION,
  HIDE_CHILDREN_UNSURE_QUERY_PARAM,
} from './children-unsure-analytics.constants';
import {
  MATCH_PREVIEW_AGE_PLACEHOLDER,
  MATCH_PREVIEW_CHIPS_SLICE,
  MATCH_TOP_PREVIEW_LIMIT,
} from './children-unsure.product-policy';
import { anyChildrenUnsure, getDisplayScore } from './children-unsure.helpers';
import { parseHideChildrenUnsure } from './children-unsure.query';

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
  children_unsure?: ChildrenUnsureDirectionsDto;
  /** Engine score before children_unsure ranking penalty (when enriched). */
  engineCompatibilityScore?: number;
}

@Controller('api/v1/matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly matchDaemon: MatchDaemonService,
    private readonly prisma: PrismaService,
    private readonly childrenUnsureAnalytics: ChildrenUnsureAnalyticsService,
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
  async list(
    @Query(HIDE_CHILDREN_UNSURE_QUERY_PARAM) hideChildrenUnsureRaw?: string,
  ): Promise<{ ok: true; items: MatchListItemDto[] }> {
    const hideChildrenUnsure = parseHideChildrenUnsure(hideChildrenUnsureRaw);
    const items = await this.matchesService.list({ hideChildrenUnsure });
    const withChildrenUnsureCount = items.filter((i) => anyChildrenUnsure(i.children_unsure)).length;
    this.childrenUnsureAnalytics.recordListOrTopResponse({
      returnedCount: items.length,
      withChildrenUnsureCount,
      hideFilterActive: hideChildrenUnsure,
    });
    return { ok: true, items };
  }

  @Get('top')
  async getTop(
    @Query(HIDE_CHILDREN_UNSURE_QUERY_PARAM) hideChildrenUnsureRaw?: string,
  ): Promise<{ ok: true; matches: DatingMatchPreviewDto[] }> {
    const hideChildrenUnsure = parseHideChildrenUnsure(hideChildrenUnsureRaw);
    const items = await this.matchesService.list({ hideChildrenUnsure });
    const withChildrenUnsureCount = items.filter((i) => anyChildrenUnsure(i.children_unsure)).length;
    this.childrenUnsureAnalytics.recordListOrTopResponse({
      returnedCount: items.length,
      withChildrenUnsureCount,
      hideFilterActive: hideChildrenUnsure,
    });
    const sorted = items
      .map((item) => {
        const engineScore = item.finalScore ?? item.overall;
        const rankScore = getDisplayScore(item);
        const otherPerson = item.b;
        const chips =
          item.explainability?.positiveChips?.slice(0, MATCH_PREVIEW_CHIPS_SLICE) ?? [];

        const hasChildrenUnsure = anyChildrenUnsure(item.children_unsure);

        const preview: DatingMatchPreviewDto = {
          id: item.matchId,
          name: otherPerson.name,
          age: MATCH_PREVIEW_AGE_PLACEHOLDER,
          summary: `Match score: ${Math.round(rankScore)}`,
          compatibilityScore: Math.round(rankScore),
          strongReason: item.shortReason || 'Good compatibility',
          frictionPoint: item.explainability?.tensionChip || 'No major tensions',
          ...(item.explainability && { explainability: item.explainability }),
          ...(item.recommendation && { recommendation: item.recommendation }),
          ...(item.children_unsure && { children_unsure: item.children_unsure }),
          ...(hasChildrenUnsure && { engineCompatibilityScore: Math.round(engineScore) }),
        };
        return preview;
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, MATCH_TOP_PREVIEW_LIMIT);
    return { ok: true, matches: sorted };
  }

  @Get('analytics/children-unsure/daily')
  async childrenUnsureDailySummary(
    @Query('date') dateUtc?: string,
  ): Promise<{ ok: true; summary: ChildrenUnsureDailySummary }> {
    return { ok: true, summary: this.childrenUnsureAnalytics.getDailySummary(dateUtc) };
  }

  @Post('analytics/children-unsure/events')
  async childrenUnsureAnalyticsEvent(
    @Body() body: { event?: string },
  ): Promise<{ ok: true; accepted: boolean }> {
    const ev = body?.event;
    if (ev === CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_IMPRESSION) {
      this.childrenUnsureAnalytics.recordBadgeImpression();
      return { ok: true, accepted: true };
    }
    if (ev === CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_CLICK) {
      this.childrenUnsureAnalytics.recordBadgeClick();
      return { ok: true, accepted: true };
    }
    return { ok: true, accepted: false };
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
