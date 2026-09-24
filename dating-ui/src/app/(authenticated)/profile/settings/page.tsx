import { ProfileSettingsPageClient } from './profile-settings-page-client';
import { buildPageMetadata } from '@/lib/platform/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) =>
      `${copy.profile.hub.tabSettings} · ${copy.profile.hub.title}`,
  });
}

export default function ProfileSettingsPage() {
  return <ProfileSettingsPageClient />;
}
