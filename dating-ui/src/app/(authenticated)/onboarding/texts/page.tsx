import type { Metadata } from 'next';
import { OnboardingTextsForm } from '@/components/onboarding-texts-form';

export const metadata: Metadata = {
  title: 'Your story',
  description: 'About you, your partner, and what you want.',
};

export default function OnboardingTextsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Step 2 — Your story
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Save a draft, or finish to submit your profile for analysis.
          </p>
        </header>
        <OnboardingTextsForm />
      </div>
    </div>
  );
}
