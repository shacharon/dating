import { redirect } from 'next/navigation';

export default function DatingAnalysisRedirectPage() {
  redirect('/profile?tab=analysis');
}
