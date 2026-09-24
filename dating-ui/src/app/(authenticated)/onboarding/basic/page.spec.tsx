import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect,
}));

import OnboardingBasicRedirectPage from './page';

describe('/onboarding/basic redirect (Story 5)', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects bare path to /onboarding/basics', async () => {
    await OnboardingBasicRedirectPage({ searchParams: {} });
    expect(redirect).toHaveBeenCalledWith('/onboarding/basics');
  });

  it('strips tab and keeps edit', async () => {
    await OnboardingBasicRedirectPage({
      searchParams: { tab: 'other', edit: '1' },
    });
    expect(redirect).toHaveBeenCalledWith('/onboarding/basics?edit=1');
  });

  it('strips tab=basic alone', async () => {
    await OnboardingBasicRedirectPage({
      searchParams: { tab: 'basic' },
    });
    expect(redirect).toHaveBeenCalledWith('/onboarding/basics');
  });
});
