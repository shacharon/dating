import type { Metadata } from 'next';
import DatingLandingPageClient from './dating-page-client';

export const metadata: Metadata = {
  title: 'Dating',
  description: 'Find your match.',
};

/**
 * Server Component shell. Hub copy + links live in `dating-page-client.tsx`
 * so locale reacts to client storage (same as other dating islands).
 *
 * Remaining client-only /dating routes (intentionally not converted):
 * - conversations/[id] — realtime messaging
 * - conversations — list tied to messaging session
 * - me-matches/[id] — interactive detail actions
 * - profile — client profile resolve + photos/prefs islands
 * - matches, matches/[id], feedback, onboarding — lower priority / interactive
 */
export default function DatingLandingPage() {
  return <DatingLandingPageClient />;
}
