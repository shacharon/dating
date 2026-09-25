import { profileEditHash } from '@/lib/profile/profile-hub-paths';
import { redirect } from 'next/navigation';

export default function SettingsPreferencesRedirectPage() {
  redirect(profileEditHash('preferences'));
}
