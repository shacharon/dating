import { redirect } from 'next/navigation';

/**
 * Legacy matches UI route - permanently redirects to /dating/me-matches.
 *
 * Removed: April 18, 2026
 * Reason: UI cutover to active product path complete; zero local dev traffic detected.
 * Backend API remains intact: GET /api/v1/matches still functional for direct API clients.
 *
 * Rollback: git revert this commit + redeploy if production traffic detected.
 */
export default function LegacyMatchesRedirect() {
  redirect('/dating/me-matches');
}
