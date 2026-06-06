import { redirect } from 'next/navigation';

export default function SettingsProfileStoryPage() {
  redirect('/onboarding/texts?edit=1');
}
