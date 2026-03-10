/**
 * In-memory implementation of the UserProfilesRepository for POC usage.
 * Uses Map-based storage, async APIs, and simple deterministic id/timestamp handling.
 */

import type {
  UserId,
  UserProfileRecord,
} from '../../../domain/users/user.types';
import type {
  UpsertUserParams,
  UserProfilesRepository,
} from '../../../domain/repositories/user-profiles.repository';
import { nextUserId, normalizeName, now } from './repo.utils';

type StoredUser = UserProfileRecord & {
  /** POC-only name used for uniqueness checks. */
  name: string;
};

export class InMemoryUserProfilesRepository implements UserProfilesRepository {
  private readonly usersById = new Map<UserId, StoredUser>();
  /** Case-insensitive index: normalized name -> userId. */
  private readonly nameIndex = new Map<string, UserId>();

  getById(id: UserId): Promise<UserProfileRecord | null> {
    const stored = this.usersById.get(id);
    return Promise.resolve(stored ? { ...stored } : null);
  }

  list(limit?: number, offset?: number): Promise<UserProfileRecord[]> {
    const all = Array.from(this.usersById.values());
    // Stable deterministic order by createdAt then id.
    all.sort((a, b) => {
      const at = a.createdAt?.getTime() ?? 0;
      const bt = b.createdAt?.getTime() ?? 0;
      if (at !== bt) return at - bt;
      return String(a.id).localeCompare(String(b.id));
    });

    const start = Math.max(0, offset ?? 0);
    const end = limit != null ? start + Math.max(0, limit) : undefined;
    const slice = all.slice(start, end).map((u) => ({ ...u }));
    return Promise.resolve(slice);
  }

  upsertUser(params: UpsertUserParams): Promise<UserProfileRecord> {
    const normalized = normalizeName(params.name);
    const existingIdByName = this.nameIndex.get(normalized);

    let targetId: UserId | undefined = params.id;
    let existing: StoredUser | undefined;

    if (existingIdByName != null) {
      if (params.id && params.id !== existingIdByName) {
        throw new Error('User name already exists for a different id');
      }
      targetId = existingIdByName;
      existing = this.usersById.get(existingIdByName);
    } else if (params.id) {
      existing = this.usersById.get(params.id);
    }

    // Determine id and timestamps.
    const isInsert = !existing;
    const id: UserId = targetId ?? nextUserId();

    const createdAt = isInsert
      ? (params.createdAt ?? now())
      : (existing?.createdAt ?? params.createdAt ?? now());

    const updatedAt =
      isInsert && params.updatedAt
        ? params.updatedAt
        : !isInsert
          ? (params.updatedAt ?? now())
          : undefined;

    const stored: StoredUser = {
      id,
      aboutMe: params.aboutMe,
      aboutPartner: params.aboutPartner,
      aboutRelationship: params.aboutRelationship,
      createdAt,
      updatedAt,
      name: params.name,
    };

    this.usersById.set(id, stored);
    this.nameIndex.set(normalized, id);

    return Promise.resolve({ ...stored });
  }

  delete(id: UserId): Promise<boolean> {
    const existing = this.usersById.get(id);
    if (!existing) return Promise.resolve(false);

    this.usersById.delete(id);

    const normalized = normalizeName(existing.name);
    const byNameId = this.nameIndex.get(normalized);
    if (byNameId === id) {
      this.nameIndex.delete(normalized);
    }

    return Promise.resolve(true);
  }
}
