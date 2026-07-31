import DatingLandingPageClient from './dating-page-client';
import { buildPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: () => 'Dating App',
    description: (copy) => copy.datingHub.subtitle,
    absolute: true,
  });
}

/**
 * Server Component shell. Hub copy + links live in `dating-page-client.tsx`
 * so locale reacts to client storage (same as other dating islands).
 *
 * Remaining client-only /dating routes (intentionally not converted):
 * - conversations/[id] — realtime messaging
 * - me-matches/[id] — interactive detail actions
 * - matches, matches/[id] — thin redirects to me-matches
 * - onboarding — interactive flow
 */
export default function DatingLandingPage() {
  return <DatingLandingPageClient />;
}
