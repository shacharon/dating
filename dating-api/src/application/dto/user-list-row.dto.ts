/**
 * Application DTO for listing users (e.g. admin/list APIs).
 * No framework decorators.
 */

import type { UserId } from '../../domain/users/user.types';

/** One row in a user list response. */
export interface UserListRowDto {
  id: UserId;
  aboutMeSnippet?: string;
  createdAt?: string;
  updatedAt?: string;
}
