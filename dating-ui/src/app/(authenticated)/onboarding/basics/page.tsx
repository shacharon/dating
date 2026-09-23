import type { Metadata } from 'next';
import { OnboardingPageHeading } from '@/components/onboarding-page-heading';
import { OnboardingFactsForm } from '@/components/onboarding-facts-form';

export const metadata: Metadata = {
  title: 'About you',
  description: 'Gender, who you are looking for, location, and birth date.',
};

export default function OnboardingBasicsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <OnboardingPageHeading step="basic" />
        <OnboardingFactsForm />
      </div>
    </div>
  );
}
