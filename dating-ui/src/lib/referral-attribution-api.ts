import { getApiBase } from '@/lib/api-base';
import {
  clearStoredReferralRef,
  readStoredReferralRef,
} from '@/lib/referral-attribution';

export async function postReferralLandingView(refPresent: boolean): Promise<void> {
  const base = getApiBase();
  const path = '/api/v1/public/funnel/referral-landing-view';
  try {
    await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refPresent }),
    });
  } catch {
    /* fire-and-forget */
  }
}

export { readStoredReferralRef, clearStoredReferralRef };
