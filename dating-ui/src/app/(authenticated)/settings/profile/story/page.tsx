import { redirect } from 'next/navigation';

export default function SettingsProfileStoryRedirectPage() {
  redirect('/profile?tab=edit#story');
}
