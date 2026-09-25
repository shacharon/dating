'use client';

import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { OnboardingAutosaveProvider } from '@/components/onboarding/onboarding-autosave';

/**
 * Onboarding steps sit under the main app nav: Story, Facts, Photos.
 * Edit mode (`?edit=1`): no progress chrome.
 */
export function OnboardingChrome({ children }: { children: ReactNode }) {
  const editMode = useSearchParams().get('edit') === '1';

  return (
    <OnboardingAutosaveProvider>
      {editMode ? (
        children
      ) : (
        <>
          <OnboardingHeader />
          <main>{children}</main>
        </>
      )}
    </OnboardingAutosaveProvider>
  );
}
