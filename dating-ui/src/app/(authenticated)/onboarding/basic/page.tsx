import type { Metadata } from 'next';
import { OnboardingBasicForm } from '@/components/onboarding-basic-form';
import { OnboardingPageHeading } from '@/components/onboarding-page-heading';

export const metadata: Metadata = {
  title: 'Profile basics',
  description: 'Name, location, and matching preferences.',
};

export default function OnboardingBasicPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <OnboardingPageHeading step="basic" />
        <OnboardingBasicForm />
      </div>
    </div>
  );
}
