import type { ProfileDraft } from '@/app/dating/_lib/types';

export type ProfileSuggestionId =
  | 'photo'
  | 'nickname'
  | 'location'
  | 'basics'
  | 'aboutMe'
  | 'aboutPartner'
  | 'aboutRelationship';

export type ProfileCompletenessFlags = {
  hasApprovedPhoto: boolean;
  basicsComplete: boolean;
  storyComplete: boolean;
  hasNickname: boolean;
  hasLocation: boolean;
  hasAboutMe: boolean;
  hasAboutPartner: boolean;
  hasAboutRelationship: boolean;
};

/** Equal weight across photo / basics / story buckets (client chrome until 35.3). */
export function basicsComplete(draft: ProfileDraft): boolean {
  return (
    draft.birthDate.trim().length > 0 &&
    draft.gender.trim().length > 0 &&
    draft.gender !== 'PREFER_NOT_TO_SAY' &&
    draft.desiredPartnerGenders.length > 0
  );
}

export function storyComplete(draft: ProfileDraft): boolean {
  return (
    draft.aboutMe.trim().length > 0 &&
    draft.aboutPartner.trim().length > 0 &&
    draft.aboutRelationship.trim().length > 0
  );
}

export function buildCompletenessFlags(
  draft: ProfileDraft,
  hasApprovedPhoto: boolean,
): ProfileCompletenessFlags {
  return {
    hasApprovedPhoto,
    basicsComplete: basicsComplete(draft),
    storyComplete: storyComplete(draft),
    hasNickname: Boolean(draft.nickname?.trim()),
    hasLocation: Boolean(
      draft.city.trim() ||
        draft.country.trim() ||
        draft.locationLabel.trim(),
    ),
    hasAboutMe: draft.aboutMe.trim().length > 0,
    hasAboutPartner: draft.aboutPartner.trim().length > 0,
    hasAboutRelationship: draft.aboutRelationship.trim().length > 0,
  };
}

export function completenessScorePercent(flags: ProfileCompletenessFlags): number {
  let done = 0;
  if (flags.hasApprovedPhoto) done += 1;
  if (flags.basicsComplete) done += 1;
  if (flags.storyComplete) done += 1;
  return Math.round((done / 3) * 100);
}

const SUGGESTION_HREF: Record<ProfileSuggestionId, string> = {
  photo: '/profile?tab=edit#photos',
  nickname: '/profile?tab=edit#basic',
  location: '/profile?tab=edit#basic',
  basics: '/profile?tab=edit#basic',
  aboutMe: '/profile?tab=edit#story',
  aboutPartner: '/profile?tab=edit#story',
  aboutRelationship: '/profile?tab=edit#story',
};

/** Prefer photo → basics → story field gaps; at most `limit` chips. */
export function suggestionChips(
  flags: ProfileCompletenessFlags,
  labels: Partial<Record<ProfileSuggestionId, string>>,
  limit = 2,
): { id: ProfileSuggestionId; label: string; href: string }[] {
  const order: ProfileSuggestionId[] = [
    'photo',
    'basics',
    'nickname',
    'location',
    'aboutMe',
    'aboutPartner',
    'aboutRelationship',
  ];
  const missing: ProfileSuggestionId[] = [];
  if (!flags.hasApprovedPhoto) missing.push('photo');
  if (!flags.basicsComplete) missing.push('basics');
  else {
    if (!flags.hasNickname) missing.push('nickname');
    if (!flags.hasLocation) missing.push('location');
  }
  if (!flags.hasAboutMe) missing.push('aboutMe');
  if (!flags.hasAboutPartner) missing.push('aboutPartner');
  if (!flags.hasAboutRelationship) missing.push('aboutRelationship');

  const ranked = order.filter((id) => missing.includes(id));
  return ranked.slice(0, limit).map((id) => ({
    id,
    label: labels[id] ?? id,
    href: SUGGESTION_HREF[id],
  }));
}

export function suggestionHref(id: ProfileSuggestionId): string {
  return SUGGESTION_HREF[id];
}
