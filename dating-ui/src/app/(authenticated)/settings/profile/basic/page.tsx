import { redirect } from 'next/navigation';

export default function SettingsProfileBasicPage() {
  redirect('/onboarding/basic?edit=1');
}
