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
  AuthLogoutBodyDto,
  AuthLogoutResponseDto,
  AuthMeResponseDto,
  AuthRefreshResponseDto,
  AuthTokenLoginResponseDto,
  GoogleIdTokenLoginDto,
  RefreshTokenBodyDto,
} from './auth.dto';
import { AuthGuard } from './auth.guard';
import { AuthLoginRateLimitGuard } from './auth-login-rate-limit.guard';
import { AuthRefreshRateLimitGuard } from './auth-refresh-rate-limit.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';

/**
 * Versioned auth: Google GIS login, opaque session cookie (web), JWT Bearer (mobile).
 */
@Controller('api/v1/auth')
export class ApiV1AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('google')
  @UseGuards(AuthLoginRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: GoogleIdTokenLoginDto,
  ): Promise<AuthTokenLoginResponseDto> {
    return this.auth.loginWithGoogleIdToken(req, res, body);
  }

  @Post('refresh')
  @UseGuards(AuthRefreshRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenBodyDto,
  ): Promise<AuthRefreshResponseDto> {
    return this.auth.refreshAccessToken(body);
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
    @Body() body: AuthLogoutBodyDto,
  ): Promise<AuthLogoutResponseDto> {
    return this.auth.logout(req, res, body);
  }
}
