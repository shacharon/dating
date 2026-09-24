'use client';

import { ProfileSettingsTab } from '@/components/profile/profile-settings-tab';
import { useScrollToHashOnMount } from '@/hooks/use-scroll-to-hash-on-mount';

export function ProfileSettingsPageClient() {
  useScrollToHashOnMount();
  return (
    <div data-testid="profile-panel-settings">
      <ProfileSettingsTab />
    </div>
  );
}
