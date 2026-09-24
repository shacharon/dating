import { PROFILE_HREF } from '@/lib/profile/profile-hub-paths';
import { redirect } from 'next/navigation';

export default function DatingAnalysisRedirectPage() {
  redirect(PROFILE_HREF.analysis);
}
