import { redirect } from 'next/navigation';

/** Old overview URL. The read-only card lives at `/profile/overview`. */
export default function ProfileIndexPage() {
  redirect('/profile/overview');
}
