import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { AuthMeResponseDto } from '../../auth/auth.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { MeProfileValidationPipe } from '../../me-profile/me-profile-validation.pipe';
import { AdminGuard } from '../admin.guard';
import { AdminContentViolationsService } from './admin-content-violations.service';
import { ListAdminBlockedUsersQueryDto } from './dto/list-admin-blocked-users.dto';
import {
  isIncludeFullTextQuery,
  ListAdminContentViolationsQueryDto,
} from './dto/list-admin-content-violations.dto';
import { UnblockContentViolationDto } from './dto/unblock-content-violation.dto';

@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminContentViolationsController {
  constructor(private readonly service: AdminContentViolationsService) {}

  @Get('content-violations/blocked-users')
  listBlockedUsers(@Query() query: ListAdminBlockedUsersQueryDto) {
    return this.service.listBlockedUsers({
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  @Get('content-violations')
  list(@Query() query: ListAdminContentViolationsQueryDto) {
    return this.service.listViolations({
      surface: query.surface,
      category: query.category,
      userId: query.userId,
      action: query.action,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      includeFullText: isIncludeFullTextQuery(query.includeFullText),
    });
  }

  @Get('content-violations/stats')
  stats() {
    return this.service.getStats();
  }

  @Post('content-violations/unblock/:userId')
  @HttpCode(HttpStatus.OK)
  @UsePipes(MeProfileValidationPipe)
  unblock(
    @CurrentUser() admin: AuthMeResponseDto,
    @Param('userId') userId: string,
    @Body() body: UnblockContentViolationDto,
  ) {
    return this.service.unblockUser(admin.id, userId, body.reason);
  }
}
