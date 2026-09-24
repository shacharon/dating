import { profileEditHash } from '@/lib/profile/profile-hub-paths';
import { redirect } from 'next/navigation';

export default function SettingsProfileBasicRedirectPage() {
  redirect(profileEditHash('basic'));
}
