import { Suspense, type ReactNode } from 'react';
import { OnboardingChrome } from './onboarding-chrome';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen font-sans">
      <Suspense fallback={children}>
        <OnboardingChrome>{children}</OnboardingChrome>
      </Suspense>
    </div>
  );
}
