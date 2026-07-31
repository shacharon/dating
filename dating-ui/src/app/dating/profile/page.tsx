import ProfilePageClient from './profile-page-client';
import { buildPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.nav.profile,
    description: (copy) => copy.profile.viewPage.subtitle,
  });
}

/**
 * Server Component shell. Profile resolve + photos/prefs islands live in
 * `profile-page-client.tsx`.
 */
export default function ProfilePage() {
  return <ProfilePageClient />;
}
