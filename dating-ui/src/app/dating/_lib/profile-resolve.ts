import type { UserProfileDto } from './user-profiles-api';
import { getProfile, listProfiles } from './user-profiles-api';
import {
  clearActiveProfileId,
  getActiveProfileId,
  setActiveProfileId,
} from './active-profile-session';

/** Backend requires non-empty trimmed aboutMe on create. */
export const CREATE_PLACEHOLDER_ABOUT_ME = 'Draft in progress…';

const DEFAULT_DISPLAY_NAME = 'You';

export function defaultCreateName(): string {
  return DEFAULT_DISPLAY_NAME;
}

function pickLatestUpdated(profiles: UserProfileDto[]): UserProfileDto {
  return [...profiles].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
}

/**
 * Loads the profile this session should use: session id first, else single/latest from API.
 */
export async function resolveEditableProfile(): Promise<UserProfileDto | null> {
  const sessionId = getActiveProfileId();
  if (sessionId) {
    const byId = await getProfile(sessionId);
    if (byId) {
      return byId;
    }
    clearActiveProfileId();
  }

  const list = await listProfiles();
  if (list.length === 0) {
    return null;
  }
  const chosen = list.length === 1 ? list[0] : pickLatestUpdated(list);
  setActiveProfileId(chosen.id);
  return chosen;
}

export function profileToFormFields(p: UserProfileDto): {
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
} {
  return {
    aboutMe: p.aboutMe === CREATE_PLACEHOLDER_ABOUT_ME ? '' : p.aboutMe,
    aboutPartner: p.aboutPartner ?? '',
    aboutRelationship: p.aboutRelationship ?? '',
  };
}

export function buildCreatePayload(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): import('./user-profiles-api').CreateUserProfilePayload {
  return {
    name: defaultCreateName(),
    aboutMe: aboutMe.trim() || CREATE_PLACEHOLDER_ABOUT_ME,
    ...(aboutPartner.trim()
      ? { aboutPartner: aboutPartner.trim() }
      : {}),
    ...(aboutRelationship.trim()
      ? { aboutRelationship: aboutRelationship.trim() }
      : {}),
  };
}

export function buildUpdatePayload(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): import('./user-profiles-api').UpdateUserProfilePayload {
  return {
    aboutMe,
    aboutPartner: aboutPartner.trim() ? aboutPartner.trim() : null,
    aboutRelationship: aboutRelationship.trim()
      ? aboutRelationship.trim()
      : null,
  };
}
