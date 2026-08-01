import type { Metadata } from 'next';
import { OnboardingIndexClient } from './onboarding-index-client';

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Continue your dating profile.',
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <OnboardingIndexClient />
      </div>
    </div>
  );
}
