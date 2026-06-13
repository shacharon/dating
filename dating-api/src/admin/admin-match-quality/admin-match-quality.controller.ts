import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthMeResponseDto } from '../../auth/auth.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { MeProfileValidationPipe } from '../../me-profile/me-profile-validation.pipe';
import { AdminGuard } from '../admin.guard';
import { AdminMatchQualityService } from './admin-match-quality.service';
import { CandidateAuditQueryDto } from './dto/candidate-audit-query.dto';
import { ListNegativeCandidatesQueryDto } from './dto/list-negative-candidates-query.dto';
import { MatchQualityCompareQueryDto } from './dto/match-quality-compare-query.dto';
import { MatchQualityExportQueryDto } from './dto/match-quality-export-query.dto';
import { MatchQualityWindowQueryDto } from './dto/match-quality-window-query.dto';
import { resolveCompareWindows } from './match-quality-window';

@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminMatchQualityController {
  constructor(private readonly matchQuality: AdminMatchQualityService) {}

  @Get('match-quality/summary')
  @UsePipes(MeProfileValidationPipe)
  getSummary(
    @CurrentUser() admin: AuthMeResponseDto,
    @Query() query: MatchQualityWindowQueryDto,
  ) {
    return this.matchQuality.getSummary(admin.id, query.windowDays ?? 7);
  }

  @Get('match-quality/negative-candidates')
  @UsePipes(MeProfileValidationPipe)
  listNegativeCandidates(@Query() query: ListNegativeCandidatesQueryDto) {
    return this.matchQuality.listNegativeCandidates(
      query.windowDays ?? 7,
      query.limit ?? 20,
      query.offset ?? 0,
    );
  }

  @Get('match-quality/compare')
  @UsePipes(MeProfileValidationPipe)
  compareMatchQuality(
    @CurrentUser() admin: AuthMeResponseDto,
    @Query() query: MatchQualityCompareQueryDto,
  ) {
    const windows = resolveCompareWindows(query);
    return this.matchQuality.compareMatchQuality(admin.id, windows);
  }

  @Get('match-quality/export')
  @UsePipes(MeProfileValidationPipe)
  async exportMatchQuality(
    @CurrentUser() admin: AuthMeResponseDto,
    @Query() query: MatchQualityExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const windowDays = query.windowDays ?? 7;
    const format = query.format ?? 'json';
    const result = await this.matchQuality.exportMatchQuality(
      admin.id,
      windowDays,
      format,
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="match-quality-export-${windowDays}d.csv"`,
      );
      return result;
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="match-quality-export-${windowDays}d.json"`,
    );
    return result;
  }

  @Get('match-quality/candidates/:profileId/audit')
  @UsePipes(MeProfileValidationPipe)
  getCandidateAudit(
    @CurrentUser() admin: AuthMeResponseDto,
    @Param('profileId') profileId: string,
    @Query() query: CandidateAuditQueryDto,
  ) {
    return this.matchQuality.getCandidateAudit(
      admin.id,
      profileId,
      query.windowDays ?? 7,
      query.viewerUserId,
    );
  }
}
