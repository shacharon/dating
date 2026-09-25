import { OnboardingPreferencesForm } from '@/components/onboarding/onboarding-preferences-form';

export default function OnboardingPreferencesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <OnboardingPreferencesForm />
      </div>
    </div>
  );
}
