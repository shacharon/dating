import { UserProfileStatus } from '@prisma/client';
import { ProfileCrudService } from '../profile/profile-crud.service';
import type { IUserProfileRepository } from './user-profile.repository';

/**
 * Architect §4: prove ProfileCrud can run against a repository double
 * without touching `prisma.userProfile`.
 */
describe('ProfileCrudService with IUserProfileRepository double', () => {
  it('getForUser returns null when port finds nothing', async () => {
    const profiles: jest.Mocked<
      Pick<IUserProfileRepository, 'findByUserIdWithPreference'>
    > = {
      findByUserIdWithPreference: jest.fn().mockResolvedValue(null),
    };
    const crud = new ProfileCrudService(
      profiles as unknown as IUserProfileRepository,
      { trace: jest.fn(), error: jest.fn() } as never,
      {} as never,
      { enqueueRebuild: jest.fn() } as never,
    );

    await expect(crud.getForUser('user_x')).resolves.toBeNull();
    expect(profiles.findByUserIdWithPreference).toHaveBeenCalledWith('user_x');
  });

  it('requireProfileForUser uses findByUserId on the port', async () => {
    const row = {
      id: 'prof_1',
      userId: 'user_1',
      status: UserProfileStatus.DRAFT,
    };
    const profiles: jest.Mocked<Pick<IUserProfileRepository, 'findByUserId'>> = {
      findByUserId: jest.fn().mockResolvedValue(row),
    };
    const crud = new ProfileCrudService(
      profiles as unknown as IUserProfileRepository,
      { trace: jest.fn(), error: jest.fn() } as never,
      {} as never,
      { enqueueRebuild: jest.fn() } as never,
    );

    await expect(crud.requireProfileForUser('user_1')).resolves.toEqual(row);
    expect(profiles.findByUserId).toHaveBeenCalledWith('user_1');
  });
});
