import {
  BadRequestException,
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
  Put,
  Query,
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
import { SendConversationMessageDto, parseMessageListLimit } from './me-conversation-messages.dto';
import { MeConversationMessagesService } from './me-conversation-messages.service';
import { CreateMatchActionDto } from './me-match-actions.dto';
import { UpsertMatchFeedbackDto } from './me-match-feedback.dto';
import { MeConversationsService } from './me-conversations.service';
import { MeMatchActionsService } from './me-match-actions.service';
import { MeMatchFeedbackService } from './me-match-feedback.service';
import { MeMatchesService } from './me-matches.service';
import { MeProfileMatchesService } from './me-profile-matches.service';
import { MeProfileService } from './me-profile.service';
import { PatchNotificationPreferencesDto } from './dto/patch-notification-preferences.dto';
import { parseMatchListLimit } from './dto/me-matches-list-query.dto';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';
import { UsersService } from '../users/users.service';

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
    private readonly matchActions: MeMatchActionsService,
    private readonly matchFeedback: MeMatchFeedbackService,
    private readonly conversations: MeConversationsService,
    private readonly conversationMessages: MeConversationMessagesService,
    private readonly obs: StructuredObservabilityService,
    private readonly users: UsersService,
  ) {}

  /**
   * Sprint 8 Story 3 — update email / in-app notification preferences (User row).
   */
  @Patch('notification-preferences')
  @HttpCode(HttpStatus.OK)
  @UsePipes(MeProfileValidationPipe)
  patchNotificationPreferences(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: PatchNotificationPreferencesDto,
  ) {
    if (
      body.emailNotificationsEnabled === undefined &&
      body.inAppNotificationsEnabled === undefined
    ) {
      throw new BadRequestException(
        'At least one notification preference must be provided',
      );
    }
    return this.users.updateNotificationPreferences(user.id, body);
  }

  /**
   * Sprint 2 Story 2 — active mutual matches for the session user (conversation list entry point).
   */
  @Get('conversations')
  listConversations(@CurrentUser() user: AuthMeResponseDto) {
    return this.conversations.list(user.id);
  }

  /**
   * Sprint 2 Story 3 — conversation shell metadata for one mutual match.
   */
  @Get('conversations/:id')
  getConversationById(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
  ) {
    return this.conversations.getById(user.id, id);
  }

  /**
   * Sprint 3 Story 4 — mark conversation as read for the session user.
   */
  @Put('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  markConversationRead(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
  ) {
    return this.conversations.markAsRead(user.id, id);
  }

  /**
   * Sprint 3 Story 2 — message history for an ACTIVE conversation (cursor pagination).
   */
  @Get('conversations/:id/messages')
  listConversationMessages(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
    @Query('limit') limitStr?: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    return this.conversationMessages.listMessages(user.id, id, {
      limit: parseMessageListLimit(limitStr),
      before: before?.trim() || undefined,
      after: after?.trim() || undefined,
    });
  }

  /**
   * Sprint 3 Story 1 — send a text message in an ACTIVE conversation.
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(MeProfileValidationPipe)
  sendConversationMessage(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
    @Body() body: SendConversationMessageDto,
  ) {
    return this.conversationMessages.sendMessage(user.id, id, body.text);
  }

  /**
   * Sprint 2 Story 5 — soft-unmatch (hide conversation for both participants).
   */
  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  unmatchConversation(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
  ) {
    return this.conversations.unmatch(user.id, id);
  }

  /**
   * Official product match endpoint. All match UI flows use this route.
   * 
   * Phase 3 Step 5 — product matches list for the authenticated user.
   * Returns `{ status: 'not_ready', reason }` when the viewer has no analyzed profile,
   * no approved photo, or has not completed onboarding — giving the UI a clean signal
   * to show an onboarding or profile prompt (`no_profile` | `not_analyzed` | `no_photo`).
   */
  @Get('matches')
  getMatchesList(
    @CurrentUser() user: AuthMeResponseDto,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    return this.matches.list(user.id, {
      cursor,
      limit: parseMatchListLimit(limitStr),
    });
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

  /**
   * Current viewer action toward a candidate (`UserProfile.id`), if any.
   */
  @Get('matches/:id/actions')
  getMatchAction(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
  ) {
    return this.matchActions.getActionState(user.id, id);
  }

  /**
   * Record a match action (Story 1: LIKE only) toward a candidate by `UserProfile.id`.
   */
  @Post('matches/:id/actions')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(MeProfileValidationPipe)
  createMatchAction(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
    @Body() body: CreateMatchActionDto,
  ) {
    return this.matchActions.createAction(user.id, id, body.action);
  }

  /**
   * Remove LIKE or PASS toward a candidate (`UserProfile.id`). BLOCK cannot be undone.
   */
  @Delete('matches/:id/actions')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMatchAction(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
  ) {
    return this.matchActions.deleteAction(user.id, id);
  }

  /**
   * Sprint 10 Story 4 — viewer sentiment toward a match suggestion (detail only).
   */
  @Get('matches/:id/feedback')
  getMatchFeedback(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
  ) {
    return this.matchFeedback.getFeedback(user.id, id);
  }

  @Put('matches/:id/feedback')
  @HttpCode(HttpStatus.OK)
  @UsePipes(MeProfileValidationPipe)
  upsertMatchFeedback(
    @CurrentUser() user: AuthMeResponseDto,
    @Param('id') id: string,
    @Body() body: UpsertMatchFeedbackDto,
  ) {
    return this.matchFeedback.upsertFeedback(user.id, id, body.sentiment);
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

  /**
   * Sprint 19 — poll async analysis job status (maps UserProfile.status).
   */
  @Get('profile/analysis-status')
  getAnalysisStatus(@CurrentUser() user: AuthMeResponseDto) {
    return this.meProfile.getAnalysisStatusForUser(user.id);
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
   * Transitions the current user's profile to SUBMITTED and enqueues analysis (Bull).
   * Returns 202 + analysisJobId immediately.
   */
  @Post('profile/submit')
  @HttpCode(HttpStatus.ACCEPTED)
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
