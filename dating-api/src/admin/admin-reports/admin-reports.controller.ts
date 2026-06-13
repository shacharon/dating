import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { UserReportStatus } from '@prisma/client';
import type { AuthMeResponseDto } from '../../auth/auth.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { MeProfileValidationPipe } from '../../me-profile/me-profile-validation.pipe';
import { AdminGuard } from '../admin.guard';
import { AdminReportsService } from './admin-reports.service';
import { ListAdminReportsQueryDto } from './dto/list-admin-reports.dto';
import { UpdateAdminReportDto } from './dto/update-admin-report.dto';

@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminReportsController {
  constructor(private readonly adminReports: AdminReportsService) {}

  @Get('reports')
  listReports(@Query() query: ListAdminReportsQueryDto) {
    return this.adminReports.listReports(
      query.status ?? UserReportStatus.OPEN,
      query.limit ?? 50,
      query.cursor,
    );
  }

  @Get('reports/:reportId')
  getReport(@Param('reportId') reportId: string) {
    return this.adminReports.getReportById(reportId);
  }

  @Patch('reports/:reportId')
  @UsePipes(MeProfileValidationPipe)
  updateReport(
    @CurrentUser() admin: AuthMeResponseDto,
    @Param('reportId') reportId: string,
    @Body() body: UpdateAdminReportDto,
  ) {
    return this.adminReports.updateReportStatus(admin.id, reportId, body);
  }
}
