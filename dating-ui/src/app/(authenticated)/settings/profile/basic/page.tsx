import { redirect } from 'next/navigation';

export default function SettingsProfileBasicRedirectPage() {
  redirect('/profile/edit#basic');
}
