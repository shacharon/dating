/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { ProfileOverviewStatusStrip } from '@/components/profile/profile-overview-status-strip';
import type { MeLatestAnalysisDto } from '@/lib/api/me-analysis-api';
import type { MeProfilePhotoDto } from '@/lib/api/me-photos-api';
import type { ProfileQualityDto } from '@/lib/api/profile-quality-api';

vi.mock('next/link', () => ({
  default({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

function draft(partial: Partial<ProfileDraft> = {}): ProfileDraft {
  return {
    nickname: '',
    aboutMe: '',
    aboutPartner: '',
    aboutRelationship: '',
    birthDate: '',
    gender: '',
    desiredPartnerGenders: [],
    city: '',
    country: '',
    locationLabel: '',
    ...partial,
  };
}

const quality: ProfileQualityDto = {
  score: 10,
  completeness: {
    hasNickname: false,
    hasLocation: false,
    hasBasics: false,
    hasAboutMe: false,
    hasAboutPartner: false,
    hasAboutRelationship: false,
    hasApprovedPhoto: false,
  },
  suggestions: [],
};

describe('ProfileOverviewStatusStrip', () => {
  afterEach(() => {
    cleanup();
  });

  it('routes four strip items and shows quality percent', () => {
    render(
      createElement(ProfileOverviewStatusStrip, {
        draft: draft({
          aboutMe: 'hello world',
          desiredPartnerGenders: ['MALE'],
          locationLabel: 'TLV',
        }),
        photos: [] as MeProfilePhotoDto[],
        quality,
        qualityLoading: false,
        qualityFailed: false,
        analysis: null,
      }),
    );

    expect(screen.getByTestId('profile-overview-score').textContent).toBe(
      '10%',
    );
    expect(
      screen.getByTestId('profile-overview-strip-story').getAttribute('href'),
    ).toBe('/profile/edit');
    expect(
      screen.getByTestId('profile-overview-strip-photos').getAttribute('href'),
    ).toBe('/profile/edit#photos');
    expect(
      screen
        .getByTestId('profile-overview-strip-matching')
        .getAttribute('href'),
    ).toBe('/profile/settings');
    expect(
      screen
        .getByTestId('profile-overview-strip-analysis')
        .getAttribute('href'),
    ).toBe('/profile/analysis');
    expect(
      screen.getByTestId('profile-overview-strip-analysis').textContent,
    ).toMatch(/not run yet/i);
  });

  it('shows analysis trait when evaluation exists', () => {
    const analysis: MeLatestAnalysisDto = {
      userProfileId: 'p1',
      evaluationId: 'e1',
      createdAt: '2026-01-01T00:00:00.000Z',
      evaluationJson: {
        chips: { self: [{ label: 'Warm and steady' }] },
      },
    };

    render(
      createElement(ProfileOverviewStatusStrip, {
        draft: draft({ aboutMe: 'enough words here for counting' }),
        photos: [],
        quality,
        qualityLoading: false,
        qualityFailed: false,
        analysis,
      }),
    );

    expect(
      screen.getByTestId('profile-overview-strip-analysis').textContent,
    ).toContain('Warm and steady');
    expect(
      screen.getByTestId('profile-overview-strip-story').textContent,
    ).toMatch(/analyzed/i);
  });
});
