'use client';

import { ProfileEditTab } from '@/components/profile/profile-edit-tab';
import { useProfileQualityRefresh } from '@/components/profile/profile-quality-refresh-context';
import { useScrollToHashOnMount } from '@/hooks/use-scroll-to-hash-on-mount';

export function ProfileEditPageClient() {
  const { bumpQualityRefresh } = useProfileQualityRefresh();
  useScrollToHashOnMount();

  return (
    <div data-testid="profile-panel-edit">
      <ProfileEditTab onProfileMutated={bumpQualityRefresh} />
    </div>
  );
}
