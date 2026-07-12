import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateUserProfileDto } from './dto/create-user-profile.dto';
import type { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import type { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UserProfilesApiRepository } from './infrastructure/user-profiles-api.repository';

@Injectable()
export class UserProfilesApiService {
  constructor(private readonly repo: UserProfilesApiRepository) {}

  list(): Promise<UserProfileResponseDto[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<UserProfileResponseDto> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundException(`User profile not found: ${id}`);
    }
    return row;
  }

  create(dto: CreateUserProfileDto): Promise<UserProfileResponseDto> {
    const name = dto.name?.trim();
    const aboutMe = dto.aboutMe?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    if (!aboutMe) {
      throw new BadRequestException('aboutMe is required');
    }
    return this.repo.create({
      ...dto,
      name,
      aboutMe,
    });
  }

  async update(
    id: string,
    dto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    const row = await this.repo.update(id, dto);
    if (!row) {
      throw new NotFoundException(`User profile not found: ${id}`);
    }
    return row;
  }

  async remove(id: string): Promise<void> {
    const ok = await this.repo.delete(id);
    if (!ok) {
      throw new NotFoundException(`User profile not found: ${id}`);
    }
  }
}
