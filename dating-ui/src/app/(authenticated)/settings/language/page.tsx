import SettingsLanguagePageClient from './language-page-client';
import { buildPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.languageSettings.title,
    description: (copy) => copy.languageSettings.description,
  });
}

/**
 * Server Component shell. Locale picker lives in `language-page-client.tsx`.
 */
export default function SettingsLanguagePage() {
  return <SettingsLanguagePageClient />;
}
