/**
 * POC domain types for the dating comparison system — users and profiles.
 * No framework decorators; safe for use in domain and application layers.
 */

/** Unique identifier for a user in the system. */
export type UserId = string;

/** Raw profile text inputs (about me, partner, relationship). */
export interface UserProfileTexts {
  aboutMe: string;
  aboutPartner?: string;
  aboutRelationship?: string;
}

/** Stored user profile record: id + profile texts + optional timestamps. */
export interface UserProfileRecord {
  id: UserId;
  aboutMe: string;
  aboutPartner?: string;
  aboutRelationship?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
