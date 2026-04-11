import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  AuthLogoutResponseDto,
  AuthMeResponseDto,
  GoogleIdTokenLoginDto,
} from './auth.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';

/**
 * Versioned cookie-session auth (no JWT, no client-supplied user id).
 * Complements legacy browser redirect routes on {@link AuthController}.
 */
@Controller('api/v1/auth')
export class ApiV1AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: GoogleIdTokenLoginDto,
  ): Promise<AuthMeResponseDto> {
    return this.auth.loginWithGoogleIdToken(req, res, body);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthMeResponseDto): AuthMeResponseDto {
    return user;
  }

  @Get('protected-test')
  @UseGuards(AuthGuard)
  protectedTest(@CurrentUser() user: AuthMeResponseDto): {
    ok: true;
    userId: string;
  } {
    return { ok: true, userId: user.id };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthLogoutResponseDto> {
    return this.auth.logout(req, res);
  }
}
