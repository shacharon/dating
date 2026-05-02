import type { Metadata } from 'next';
import { OnboardingPageHeading } from '@/components/onboarding-page-heading';
import { OnboardingTextsForm } from '@/components/onboarding-texts-form';

export const metadata: Metadata = {
  title: 'Your story',
  description: 'About you, your partner, and what you want.',
};

export default function OnboardingTextsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <OnboardingPageHeading step="texts" />
        <OnboardingTextsForm />
      </div>
    </div>
  );
}
