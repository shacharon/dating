import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { CreateUserProfileDto } from './dto/create-user-profile.dto';
import type { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfilesApiService } from './user-profiles-api.service';

@Controller('api/v1/user-profiles')
export class UserProfilesApiController {
  constructor(private readonly userProfilesApi: UserProfilesApiService) {}

  @Get()
  list() {
    return this.userProfilesApi.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.userProfilesApi.getById(id);
  }

  @Post()
  create(@Body() body: CreateUserProfileDto) {
    return this.userProfilesApi.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserProfileDto) {
    return this.userProfilesApi.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.userProfilesApi.remove(id);
  }
}
