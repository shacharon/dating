/**

 * Prisma-backed UserProfilesRepository. Maps persistence rows to domain records only.

 */



import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { UserId, UserProfileRecord } from '../../domain/users/user.types';

import type {

  UpsertUserParams,

  UserProfilesRepository,

} from '../../domain/repositories/user-profiles.repository';



/**

 * Legacy repository over `MatchmakingProfile`. Reads/writes disabled (slices 7–8 / pre–Migration 4).

 */

@Injectable()

export class PrismaUserProfilesRepository implements UserProfilesRepository {

  async getById(_id: UserId): Promise<UserProfileRecord | null> {

    return null;

  }



  async list(_limit?: number, _offset?: number): Promise<UserProfileRecord[]> {

    return [];

  }



  async upsertUser(params: UpsertUserParams): Promise<UserProfileRecord> {

    void params;

    throw new ServiceUnavailableException(

      'UserProfilesRepository writes disabled: MatchmakingProfile slice 7 (pre–Migration 4).',

    );

  }



  async delete(id: UserId): Promise<boolean> {

    void id;

    throw new ServiceUnavailableException(

      'UserProfilesRepository writes disabled: MatchmakingProfile slice 7 (pre–Migration 4).',

    );

  }

}

