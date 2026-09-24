import { ProfileEditPageClient } from './profile-edit-page-client';
import { buildPageMetadata } from '@/lib/platform/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) =>
      `${copy.profile.hub.tabEdit} · ${copy.profile.hub.title}`,
  });
}

export default function ProfileEditPage() {
  return <ProfileEditPageClient />;
}
