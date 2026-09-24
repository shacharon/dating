export type ProfileHubSectionId =
  | 'overview'
  | 'edit'
  | 'analysis'
  | 'settings';

export type ProfileEditHashId = 'basic' | 'photos' | 'story';

export type ProfileSettingsHashId =
  | 'nickname'
  | 'dating-chapter'
  | 'notifications';

export const PROFILE_HREF = {
  overview: '/profile',
  edit: '/profile/edit',
  analysis: '/profile/analysis',
  settings: '/profile/settings',
} as const satisfies Record<ProfileHubSectionId, string>;

const SECTION_IDS: readonly ProfileHubSectionId[] = [
  'overview',
  'edit',
  'analysis',
  'settings',
] as const;

export function profileEditHash(id: ProfileEditHashId): string {
  return `${PROFILE_HREF.edit}#${id}`;
}

export function profileSettingsHash(id: ProfileSettingsHashId): string {
  return `${PROFILE_HREF.settings}#${id}`;
}

/** Map legacy `?tab=` values to a profile path. Unknown → null. */
export function pathForLegacyTab(tab: string | null): string | null {
  if (!tab) return null;
  if (SECTION_IDS.includes(tab as ProfileHubSectionId)) {
    return PROFILE_HREF[tab as ProfileHubSectionId];
  }
  return null;
}

/** Active section from pathname (`/profile` exact = overview). */
export function profileSectionFromPathname(
  pathname: string,
): ProfileHubSectionId {
  if (pathname === PROFILE_HREF.edit || pathname.startsWith(`${PROFILE_HREF.edit}/`)) {
    return 'edit';
  }
  if (
    pathname === PROFILE_HREF.analysis ||
    pathname.startsWith(`${PROFILE_HREF.analysis}/`)
  ) {
    return 'analysis';
  }
  if (
    pathname === PROFILE_HREF.settings ||
    pathname.startsWith(`${PROFILE_HREF.settings}/`)
  ) {
    return 'settings';
  }
  return 'overview';
}
