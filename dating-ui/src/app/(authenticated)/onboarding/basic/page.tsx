import type { Metadata } from 'next';
import { OnboardingBasicForm } from '@/components/onboarding-basic-form';

export const metadata: Metadata = {
  title: 'Profile basics',
  description: 'Name, location, and matching preferences.',
};

export default function OnboardingBasicPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Step 1 — Basics
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Save anytime; your answers reload from the server when you return.
          </p>
        </header>
        <OnboardingBasicForm />
      </div>
    </div>
  );
}
