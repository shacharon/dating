import type { Metadata } from 'next';
import { OnboardingDraftForm } from '@/components/onboarding-draft-form';

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Create your dating profile draft.',
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Your profile
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Three short sections are enough for now. Save anytime; your draft is tied to this
            account. Continue when you want to review on the profile page, or leave and return
            later—the form reloads from the server.
          </p>
        </header>
        <OnboardingDraftForm />
      </div>
    </div>
  );
}
