import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { AuthMeResponseDto } from '../auth/auth.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateMeProfileDto, PatchMeProfileDto } from './me-profile.dto';
import { MeProfileService } from './me-profile.service';

const meProfileBodyPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

/**
 * Authenticated product profile (1:1 with `User`). User id is always from the session — never from the client path or body.
 */
@Controller('api/v1/me')
@UseGuards(AuthGuard)
export class MeProfileController {
  constructor(private readonly meProfile: MeProfileService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthMeResponseDto) {
    const row = await this.meProfile.getForUser(user.id);
    if (!row) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account yet. Use POST /api/v1/me/profile to create one.',
      });
    }
    return row;
  }

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(meProfileBodyPipe)
  createProfile(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: CreateMeProfileDto,
  ) {
    return this.meProfile.createForUser(user.id, body);
  }

  @Patch('profile')
  @UsePipes(meProfileBodyPipe)
  patchProfile(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: PatchMeProfileDto,
  ) {
    return this.meProfile.patchForUser(user.id, body);
  }
}
