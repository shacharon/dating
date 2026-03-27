import type { ProfileDraft } from './types';

const STORAGE_KEY = 'dating-onboarding-draft';

const emptyDraft = (): ProfileDraft => ({
  aboutMe: '',
  aboutPartner: '',
  aboutRelationship: '',
});

function parseDraft(raw: string): ProfileDraft {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      aboutMe: typeof parsed.aboutMe === 'string' ? parsed.aboutMe : '',
      aboutPartner: typeof parsed.aboutPartner === 'string' ? parsed.aboutPartner : '',
      aboutRelationship:
        typeof parsed.aboutRelationship === 'string' ? parsed.aboutRelationship : '',
    };
  } catch {
    return emptyDraft();
  }
}

/** Read the in-browser profile draft. Safe on server (returns empty strings). */
export function getDraft(): ProfileDraft {
  if (typeof window === 'undefined') return emptyDraft();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyDraft();
  return parseDraft(raw);
}

/** Persist the profile draft (onboarding / profile edit flow). */
export function saveDraft(draft: ProfileDraft): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

/** Clear stored draft (e.g. reset flow); no-op on server. */
export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isDraftMeaningfullyEmpty(draft: ProfileDraft): boolean {
  return (
    !draft.aboutMe.trim() && !draft.aboutPartner.trim() && !draft.aboutRelationship.trim()
  );
}
