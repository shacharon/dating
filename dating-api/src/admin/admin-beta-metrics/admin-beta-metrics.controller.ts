import { Controller, Get, Query, UseGuards, UsePipes } from '@nestjs/common';
import type { AuthMeResponseDto } from '../../auth/auth.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { MeProfileValidationPipe } from '../../me-profile/me-profile-validation.pipe';
import { AdminGuard } from '../admin.guard';
import { AdminBetaMetricsService } from './admin-beta-metrics.service';
import { BetaMetricsQueryDto } from './dto/beta-metrics-query.dto';

@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminBetaMetricsController {
  constructor(private readonly betaMetrics: AdminBetaMetricsService) {}

  @Get('beta-metrics')
  @UsePipes(MeProfileValidationPipe)
  getBetaMetrics(
    @CurrentUser() admin: AuthMeResponseDto,
    @Query() query: BetaMetricsQueryDto,
  ) {
    return this.betaMetrics.getMetrics(admin.id, query.betaStart);
  }
}
