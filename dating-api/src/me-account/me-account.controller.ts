import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthMeResponseDto } from '../auth/auth.dto';
import {
  httpOnlyLaxSessionCookieBase,
} from '../auth/auth-cookies.util';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import { MeProfileValidationPipe } from '../me-profile/me-profile-validation.pipe';
import { SessionService } from '../session/session.service';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { MeAccountService } from './me-account.service';

@Controller('api/v1/me')
@UseGuards(AuthGuard)
export class MeAccountController {
  constructor(
    private readonly meAccount: MeAccountService,
    private readonly sessions: SessionService,
    private readonly cfg: AuthSessionConfigService,
    private readonly socketRegistry: MessagingSocketRegistry,
  ) {}

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(MeProfileValidationPipe)
  async deleteAccount(
    @CurrentUser() user: AuthMeResponseDto,
    @Res({ passthrough: true }) res: Response,
    @Body() body: DeleteAccountDto,
  ): Promise<void> {
    await this.meAccount.deleteAccountForUser(user.id, body.confirmation);
    this.socketRegistry.disconnectByUserId(user.id);
    await this.sessions.revokeAllSessionsForUser(user.id);
    res.clearCookie(
      this.cfg.sessionCookieName,
      httpOnlyLaxSessionCookieBase({
        secure: this.cfg.cookieSecure,
        domain: this.cfg.cookieDomain,
      }),
    );
  }
}
