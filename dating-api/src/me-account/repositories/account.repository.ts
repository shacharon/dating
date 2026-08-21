export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface IAccountRepository {
  findActiveUser(
    userId: string,
  ): Promise<{ id: string; deletedAt: Date | null } | null>;
  findProfileIdByUserId(userId: string): Promise<string | null>;
  listPhotoStorageKeys(
    profileId: string,
  ): Promise<Array<{ id: string; storageKey: string }>>;
  scrubAndSoftDeleteAccount(args: {
    userId: string;
    profileId: string | null;
    now: Date;
  }): Promise<void>;
}
