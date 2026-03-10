/**
 * POC repository interface for user profiles.
 * Domain-only; no framework decorators. Implement in infrastructure layer.
 */

import type {
  UserId,
  UserProfileRecord,
  UserProfileTexts,
} from '../users/user.types';

/** Parameters for a domain-level user upsert operation. */
export interface UpsertUserParams extends UserProfileTexts {
  /** Existing id to update; if omitted, a new user will be created. */
  id?: UserId;
  /**
   * POC-only display name. Treated as unique (case-insensitive) for lookup.
   */
  name: string;
  /**
   * Optional timestamps.
   * - On insert: createdAt defaults to now when omitted.
   * - On update: createdAt from the existing record is always preserved.
   * - updatedAt: on update, is refreshed when caller does not set it.
   */
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfilesRepository {
  getById(id: UserId): Promise<UserProfileRecord | null>;
  list(limit?: number, offset?: number): Promise<UserProfileRecord[]>;
  upsertUser(params: UpsertUserParams): Promise<UserProfileRecord>;
  delete(id: UserId): Promise<boolean>;
}

/** Injection token for Nest DI. */
export const USER_PROFILES_REPOSITORY = Symbol('UserProfilesRepository');
