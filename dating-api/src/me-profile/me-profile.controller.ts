import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import type { AuthMeResponseDto } from '../auth/auth.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  CreateMeProfileDto,
  PatchMeProfileDto,
} from './me-profile.dto';
import { MeMatchesService } from './me-matches.service';
import { MeProfileMatchesService } from './me-profile-matches.service';
import { MeProfileService } from './me-profile.service';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';

/**
 * Authenticated product profile (1:1 with `User`). User id is always from the session — never from the client path or body.
 */
@Controller('api/v1/me')
@UseGuards(AuthGuard)
export class MeProfileController {
  constructor(
    private readonly meProfile: MeProfileService,
    private readonly meMatches: MeProfileMatchesService,
    private readonly matches: MeMatchesService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  /**
   * Official product match endpoint. All match UI flows use this route.
   * 
   * Phase 3 Step 5 — product matches list for the authenticated user.
   * Returns `{ status: 'not_ready', reason }` when the viewer has no analyzed profile
   * instead of a hard 4xx, giving the UI a clean signal to show an onboarding prompt.
   */
  @Get('matches')
  getMatchesList(@CurrentUser() user: AuthMeResponseDto) {
    return this.matches.list(user.id);
  }

  /**
   * Official product match endpoint. All match UI flows use this route.
   * 
   * Phase 3 Step 5 — match detail for a single candidate by their `UserProfile.id`.
   * 404 when viewer is not ready, candidate does not exist, or gender filter fails.
   * Raw profile text fields are never exposed in the response.
   */
  @Get('matches/:id')
  getMatchById(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
  ) {
    return this.matches.getById(user.id, id);
  }

  @Get('matches/:id/photos/:photoId/file')
  async getMatchPrimaryPhotoFile(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.matches.getPrimaryPhotoFileById(user.id, id, photoId);
    res.setHeader('Content-Type', file.contentType);
    return new StreamableFile(file.content);
  }

  /**
   * @deprecated Phase 3 Step 4 — legacy candidate-only list.
   * Use GET /api/v1/me/matches for scored match results.
   * 
   * Phase 3 Step 4 — gender-filtered candidate list driven by the authenticated user's
   * `UserProfile` (new product flow). Candidates are all other `ANALYZED` product profiles.
   * Both directions of the partner-gender filter must pass (reciprocal).
   * Legacy `MatchmakingProfile` is NOT used on this path.
   */
  @Get('profile/matches')
  getMatches(@CurrentUser() user: AuthMeResponseDto) {
    return this.meMatches.getMatchesForUser(user.id);
  }

  /**
   * Latest product analysis snapshot (`UserProfileEvaluation`) for the session user.
   * `evaluationId` / `evaluationJson` are null when no successful analysis row exists yet.
   */
  @Get('profile/analysis/latest')
  getLatestAnalysis(@CurrentUser() user: AuthMeResponseDto) {
    return this.meProfile.getLatestAnalysisForUser(user.id);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthMeResponseDto) {
    const row = await this.meProfile.getForUser(user.id);
    if (!row) {
      this.obs.trace(
        'me profile GET: no row for current user',
        ErrorCodes.ME_PROFILE_GET_NOT_FOUND,
      );
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
  @UsePipes(MeProfileValidationPipe)
  createProfile(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: CreateMeProfileDto,
  ) {
    return this.meProfile.createForUser(user.id, body);
  }

  @Patch('profile')
  @UsePipes(MeProfileValidationPipe)
  patchProfile(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: PatchMeProfileDto,
  ) {
    return this.meProfile.patchForUser(user.id, body);
  }

  /**
   * Transitions the current user's profile to SUBMITTED.
   * Requires an existing profile in DRAFT, ANALYZED, or FAILED state.
   * Returns the updated profile row.
   */
  @Post('profile/submit')
  @HttpCode(HttpStatus.OK)
  submitProfile(@CurrentUser() user: AuthMeResponseDto) {
    return this.meProfile.submitForUser(user.id);
  }

  @Post('profile/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: AuthMeResponseDto,
    @UploadedFile()
    file?: {
      mimetype: string;
      size: number;
      originalname?: string;
      buffer: Buffer;
    },
  ) {
    return this.meProfile.uploadPhotoForUser(user.id, file);
  }

  @Get('profile/photos')
  listPhotos(@CurrentUser() user: AuthMeResponseDto) {
    return this.meProfile.listPhotosForUser(user.id);
  }

  @Delete('profile/photos/:photoId')
  deletePhoto(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('photoId') photoId: string,
  ) {
    return this.meProfile.deletePhotoForUser(user.id, photoId);
  }

  @Patch('profile/photos/:photoId/primary')
  setPrimaryPhoto(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('photoId') photoId: string,
  ) {
    return this.meProfile.setPrimaryPhotoForUser(user.id, photoId);
  }

  @Get('profile/photos/:photoId/file')
  async getPhotoFile(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('photoId') photoId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.meProfile.getPhotoFileForUser(user.id, photoId);
    res.setHeader('Content-Type', file.contentType);
    return new StreamableFile(file.content);
  }
}
