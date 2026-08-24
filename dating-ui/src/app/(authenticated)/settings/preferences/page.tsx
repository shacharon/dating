import { MatchPreferencesForm } from '@/components/match-preferences-form';
import { buildPageMetadata } from '@/lib/platform/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.matchPreferences.title,
    description: (copy) => copy.matchPreferences.subtitle,
  });
}

export default function SettingsPreferencesPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <MatchPreferencesForm showTitle />
    </main>
  );
}
