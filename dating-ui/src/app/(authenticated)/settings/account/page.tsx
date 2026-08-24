import SettingsAccountPageClient from './account-page-client';
import { buildPageMetadata } from '@/lib/platform/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.accountSettings.title,
    description: (copy) => copy.accountSettings.subtitle,
  });
}

/**
 * Server Component shell. Account links + delete flow live in
 * `account-page-client.tsx`.
 */
export default function SettingsAccountPage() {
  return <SettingsAccountPageClient />;
}
