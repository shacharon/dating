import {
  Body,
  Controller,
  Delete,
  Inject,
  Post,
  UseGuards,
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
export class DeviceTokensController {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokens: IDeviceTokenRepository,
  ) {}

  @Post()
  async register(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: RegisterDeviceDto,
  ): Promise<{ ok: true }> {
    await this.deviceTokens.upsert(
      user.id,
      body.token.trim(),
      body.platform,
    );
    return { ok: true };
  }

  @Delete()
  async unregister(
    @CurrentUser() user: AuthMeResponseDto,
    @Body() body: UnregisterDeviceDto,
  ): Promise<{ ok: true }> {
    await this.deviceTokens.deleteForUser(user.id, body.token.trim());
    return { ok: true };
  }
}
