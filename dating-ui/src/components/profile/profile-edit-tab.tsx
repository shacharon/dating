'use client';

import { useCallback, useEffect, useState } from 'react';
import { OnboardingBasicForm } from '@/components/onboarding-basic-form';
import { OnboardingTextsForm } from '@/components/onboarding-texts-form';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import {
  ProfileEditSectionNav,
  type EditSectionId,
} from '@/components/profile/profile-edit-section-nav';
import { ProfileEditSectionShell } from '@/components/profile/profile-edit-section-shell';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import {
  emptyProfileFormState,
  profileToFormFields,
  resolveEditableProfile,
} from '@/lib/profile-form';
import { buildCompletenessFlags } from '@/lib/profile-completeness';
import { listMyProfilePhotos } from '@/lib/me-photos-api';
import { useAppLocale } from '@/lib/i18n';

const SECTION_IDS: EditSectionId[] = ['basic', 'photos', 'story'];

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
): Record<EditSectionId, boolean> {
  const flags = buildCompletenessFlags(draft, approvedPhotoCount > 0);
  return {
    basic: flags.basicsComplete && flags.hasNickname && flags.hasLocation,
    photos: approvedPhotoCount > 0,
    story: flags.hasAboutMe,
  };
}

/**
 * Profile hub Edit tab: sticky section nav; one pane at a time (Basics / Photos / Story).
 */
export function ProfileEditTab({
  onProfileMutated,
}: {
  onProfileMutated?: () => void;
} = {}) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;

  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileFormState);
  const [approvedPhotoCount, setApprovedPhotoCount] = useState(0);
  const [active, setActive] = useState<EditSectionId>(
    () => sectionFromHash() ?? 'basic',
  );

  const refreshProgress = useCallback(async () => {
    try {
      const [profile, photos] = await Promise.all([
        resolveEditableProfile(),
        listMyProfilePhotos(),
      ]);
      const next = profile
        ? profileToFormFields(profile)
        : emptyProfileFormState();
      const approved = photos.filter((p) => p.status === 'APPROVED').length;
      setDraft(next);
      setApprovedPhotoCount(approved);
    } catch {
      // keep last known progress
    }
  }, []);

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

  const complete = sectionComplete(draft, approvedPhotoCount);

  function handleMutated() {
    onProfileMutated?.();
    void refreshProgress();
  }

  function navigate(id: EditSectionId) {
    setActive(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/profile?tab=edit#${id}`);
    }
  }

  return (
    <div className="space-y-6" data-testid="profile-edit-tab">
      <ProfileEditSectionNav
        active={active}
        labels={{
          basic: hub.editSectionBasic,
          photos: hub.editSectionPhotos,
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
