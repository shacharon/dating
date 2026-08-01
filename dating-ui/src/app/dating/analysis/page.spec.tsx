import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect,
}));

import DatingAnalysisRedirectPage from './page';

describe('/dating/analysis page', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects to /profile?tab=analysis', () => {
    DatingAnalysisRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile?tab=analysis');
  });
});
