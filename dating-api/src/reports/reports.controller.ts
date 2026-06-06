import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { AuthMeResponseDto } from '../auth/auth.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MeProfileValidationPipe } from '../me-profile/me-profile-validation.pipe';
import { CreateUserReportDto } from './dto/create-user-report.dto';
import { ReportsService } from './reports.service';

@Controller('api/v1/me')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(MeProfileValidationPipe)
  createReport(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: CreateUserReportDto,
  ) {
    return this.reports.createReport(user.id, body);
  }
}
