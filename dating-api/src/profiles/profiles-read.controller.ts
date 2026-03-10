import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import type { ProfileJsonPayload, ProfileListItem } from './profiles-json.service';
import { ProfilesJsonService } from './profiles-json.service';

export interface ProfilesListResponseDto {
  ok: true;
  items: ProfileListItem[];
}

export interface ProfileGetResponseDto {
  ok: true;
  profile: ProfileJsonPayload;
}

@Controller('api/v1/profiles')
export class ProfilesReadController {
  constructor(private readonly profilesJson: ProfilesJsonService) {}

  @Get()
  async list(): Promise<ProfilesListResponseDto> {
    const items = await this.profilesJson.list();
    return { ok: true, items };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ProfileGetResponseDto> {
    const profile = await this.profilesJson.getById(id);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return { ok: true, profile };
  }
}
