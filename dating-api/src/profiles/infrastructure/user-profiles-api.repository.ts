/**

 * HTTP CRUD for UserProfile — legacy `MatchmakingProfile` delegate. Reads/writes disabled (slices 7–8).

 */



import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { CreateUserProfileDto } from '../dto/create-user-profile.dto';

import type { UpdateUserProfileDto } from '../dto/update-user-profile.dto';

import type { UserProfileResponseDto } from '../dto/user-profile-response.dto';



@Injectable()

export class UserProfilesApiRepository {

  async findAll(): Promise<UserProfileResponseDto[]> {

    return [];

  }



  async findById(_id: string): Promise<UserProfileResponseDto | null> {

    return null;

  }



  async create(dto: CreateUserProfileDto): Promise<UserProfileResponseDto> {

    void dto;

    throw new ServiceUnavailableException(

      'UserProfilesApi writes disabled: MatchmakingProfile slice 7 (pre–Migration 4).',

    );

  }



  async update(

    id: string,

    dto: UpdateUserProfileDto,

  ): Promise<UserProfileResponseDto | null> {

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) {

      data.name = dto.name;

    }

    if (dto.aboutMe !== undefined) {

      data.aboutMe = dto.aboutMe;

    }

    if (dto.aboutPartner !== undefined) {

      data.aboutPartner = dto.aboutPartner;

    }

    if (dto.aboutRelationship !== undefined) {

      data.aboutRelationship = dto.aboutRelationship;

    }

    if (Object.keys(data).length === 0) {

      return null;

    }

    void id;

    throw new ServiceUnavailableException(

      'UserProfilesApi writes disabled: MatchmakingProfile slice 7 (pre–Migration 4).',

    );

  }



  async delete(id: string): Promise<boolean> {

    void id;

    throw new ServiceUnavailableException(

      'UserProfilesApi writes disabled: MatchmakingProfile slice 7 (pre–Migration 4).',

    );

  }

}

