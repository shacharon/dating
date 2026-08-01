import { Suspense, type ReactNode } from 'react';
import { OnboardingHeader } from '@/components/onboarding/onboarding-header';

function OnboardingHeaderFallback() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-40 h-14 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      aria-hidden
    />
  );
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen font-sans">
      <Suspense fallback={<OnboardingHeaderFallback />}>
        <OnboardingHeader />
      </Suspense>
      <main className="pt-20">{children}</main>
    </div>
  );
}
