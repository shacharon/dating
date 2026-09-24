'use client';

import { ProfileAnalysisTab } from '@/components/profile/profile-analysis-tab';
import { useScrollToHashOnMount } from '@/hooks/use-scroll-to-hash-on-mount';

export function ProfileAnalysisPageClient() {
  useScrollToHashOnMount();
  return (
    <div data-testid="profile-panel-analysis">
      <ProfileAnalysisTab />
    </div>
  );
}
