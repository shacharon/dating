import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { AuthMeResponseDto } from '../auth/auth.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UnregisterDeviceDto } from './dto/unregister-device.dto';
import {
  DEVICE_TOKEN_REPOSITORY,
  type IDeviceTokenRepository,
} from './repositories/device-token.repository';

@Controller('api/v1/me/devices')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class DeviceTokensController {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokens: IDeviceTokenRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async register(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: RegisterDeviceDto,
  ): Promise<{ ok: true }> {
    await this.deviceTokens.upsert(user.id, body.token, body.platform);
    return { ok: true };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async unregister(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: UnregisterDeviceDto,
  ): Promise<{ ok: true }> {
    await this.deviceTokens.deleteForUser(user.id, body.token);
    return { ok: true };
  }
}
