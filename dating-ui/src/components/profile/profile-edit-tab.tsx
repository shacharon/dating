'use client';

import { useCallback, useEffect, useState } from 'react';
import { OnboardingBasicForm } from '@/components/onboarding-basic-form';
import { OnboardingTextsForm } from '@/components/onboarding-texts-form';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { ProfileEditPreferencesSection } from '@/components/profile/profile-edit-preferences-section';
import {
  ProfileEditSectionNav,
  type EditSectionId,
} from '@/components/profile/profile-edit-section-nav';
import { ProfileEditSectionShell } from '@/components/profile/profile-edit-section-shell';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import {
  emptyProfileFormState,
  profileToFormFields,
} from '@/lib/profile/profile-form';
import { buildCompletenessFlags } from '@/lib/profile/profile-completeness';
import { listMyProfilePhotos } from '@/lib/api/me-photos-api';
import { useAppLocale } from '@/lib/i18n';
import { useProfile } from '@/hooks/use-profile';
import type { MeProfileDto } from '@/lib/api/me-profile-api';
import { profileEditHash } from '@/lib/profile/profile-hub-paths';

const SECTION_IDS: EditSectionId[] = ['story', 'basic', 'preferences', 'photos'];

function sectionFromHash(): EditSectionId | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  return SECTION_IDS.includes(hash as EditSectionId)
    ? (hash as EditSectionId)
    : null;
}

function sectionComplete(
  draft: ProfileDraft,
  approvedPhotoCount: number,
  profile: MeProfileDto | null,
): Record<EditSectionId, boolean> {
  const flags = buildCompletenessFlags(draft, approvedPhotoCount > 0);
  return {
    basic: flags.basicsComplete && flags.hasLocation,
    photos: approvedPhotoCount > 0,
    preferences:
      profile?.partnerAgeMin != null ||
      profile?.partnerAgeMax != null ||
      profile?.maxDistanceKm != null,
    story: flags.hasAboutMe,
  };
}

/**
 * Profile hub Edit tab: sticky section nav; one pane at a time.
 */
export function ProfileEditTab({
  onProfileMutated,
}: {
  onProfileMutated?: () => void;
} = {}) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const { profile, refetch } = useProfile();

  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileFormState);
  const [approvedPhotoCount, setApprovedPhotoCount] = useState(0);
  const [active, setActive] = useState<EditSectionId>(
    () => sectionFromHash() ?? 'story',
  );

  useEffect(() => {
    if (profile) {
      setDraft(profileToFormFields(profile));
    }
  }, [profile]);

  const refreshProgress = useCallback(async () => {
    try {
      const [, photos] = await Promise.all([
        refetch(),
        listMyProfilePhotos(),
      ]);
      const approved = photos.filter((p) => p.status === 'APPROVED').length;
      setApprovedPhotoCount(approved);
    } catch {
      // keep last known progress
    }
  }, [refetch]);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  useEffect(() => {
    const syncFromHash = () => {
      const fromHash = sectionFromHash();
      if (fromHash) setActive(fromHash);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const complete = sectionComplete(draft, approvedPhotoCount, profile);

  function handleMutated() {
    onProfileMutated?.();
    void refreshProgress();
  }

  function navigate(id: EditSectionId) {
    setActive(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', profileEditHash(id));
    }
  }

  return (
    <div className="space-y-6" data-testid="profile-edit-tab">
      <ProfileEditSectionNav
        active={active}
        labels={{
          basic: hub.editSectionBasic,
          photos: hub.editSectionPhotos,
          preferences: hub.editSectionPreferences,
          story: hub.editSectionStory,
        }}
        complete={complete}
        onNavigate={navigate}
      />

      <ProfileEditSectionShell
        id="basic"
        title={hub.editSectionBasic}
        complete={complete.basic}
        active={active === 'basic'}
      >
        <OnboardingBasicForm variant="profileHub" onSaved={handleMutated} />
      </ProfileEditSectionShell>

      <ProfileEditSectionShell
        id="preferences"
        title={hub.editSectionPreferences}
        complete={complete.preferences}
        active={active === 'preferences'}
      >
        <ProfileEditPreferencesSection onSaved={handleMutated} />
      </ProfileEditSectionShell>

      <ProfileEditSectionShell
        id="photos"
        title={hub.editSectionPhotos}
        complete={complete.photos}
        active={active === 'photos'}
      >
        <ProfilePhotoSection
          requiredForMatching
          onMutated={handleMutated}
        />
      </ProfileEditSectionShell>

      <ProfileEditSectionShell
        id="story"
        title={hub.editSectionStory}
        complete={complete.story}
        active={active === 'story'}
      >
        <OnboardingTextsForm variant="profileHub" onSaved={handleMutated} />
      </ProfileEditSectionShell>
    </div>
  );
}
