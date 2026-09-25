/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyProfile, listMyProfilePhotos, patchMyProfile } = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  listMyProfilePhotos: vi.fn(),
  patchMyProfile: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    profile: {
      fetchMyProfile,
      patchMyProfile,
      createMyProfile: vi.fn(),
      submitMyProfileForAnalysis: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api/me-photos-api', () => ({
  listMyProfilePhotos,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', displayName: 'Test User' },
    status: 'authenticated',
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/components/onboarding-facts-form', () => ({
  OnboardingFactsForm: () => <div data-testid="mock-facts-form">facts</div>,
}));
vi.mock('@/components/onboarding-texts-form', () => ({
  OnboardingTextsForm: () => <div data-testid="mock-texts-form">texts</div>,
}));
vi.mock('@/components/profile-photo-section', () => ({
  ProfilePhotoSection: () => <div data-testid="mock-photos">photos</div>,
}));

import { ProfileEditTab } from '@/components/profile/profile-edit-tab';
import { enCopy } from '@/lib/i18n/en';
import { esCopy } from '@/lib/i18n/es';
import { heCopy } from '@/lib/i18n/he';

function renderEditTab() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(ProfileEditTab),
    ),
  );
}

describe('ProfileEditTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/profile/edit');
    listMyProfilePhotos.mockResolvedValue([
      { id: 'p1', status: 'APPROVED', isPrimary: true, position: 0 },
    ]);
    fetchMyProfile.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      nickname: 'Noa',
      birthDate: '1990-01-01',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'TLV',
      aboutMe: 'Hello world',
      aboutPartner: '',
      aboutRelationship: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows one pane at a time with Story → Facts → Photos → Preferences nav order', async () => {
    renderEditTab();
    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-tab')).toBeTruthy();
      expect(screen.getByTestId('profile-edit-section-nav')).toBeTruthy();
    });

    const navButtons = [
      screen.getByTestId('profile-edit-nav-story'),
      screen.getByTestId('profile-edit-nav-basic'),
      screen.getByTestId('profile-edit-nav-photos'),
      screen.getByTestId('profile-edit-nav-preferences'),
    ];
    expect(
      navButtons[0]!.compareDocumentPosition(navButtons[1]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      navButtons[1]!.compareDocumentPosition(navButtons[2]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      navButtons[2]!.compareDocumentPosition(navButtons[3]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.getByTestId('profile-edit-section-story').hidden).toBe(false);
    expect(screen.getByTestId('profile-edit-section-basic').hidden).toBe(true);
    expect(screen.getByTestId('profile-edit-section-preferences').hidden).toBe(
      true,
    );
    expect(screen.getByTestId('profile-edit-section-photos').hidden).toBe(true);
    expect(screen.getByTestId('mock-texts-form')).toBeTruthy();
    expect(screen.getByTestId('mock-facts-form')).toBeTruthy();
    expect(screen.getByTestId('profile-edit-nav-basic').textContent).toBe('Facts');
    expect(screen.getByTestId('profile-edit-progress-dots').getAttribute('aria-label')).toMatch(
      /of 4 sections complete/,
    );
    expect(
      screen.getByTestId('profile-edit-nav-story').getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByTestId('profile-edit-nav-preferences').hasAttribute('aria-current'),
    ).toBe(false);
  });

  it('opens Facts in place under the basic hash', async () => {
    renderEditTab();
    await screen.findByTestId('profile-edit-nav-basic');
    fireEvent.click(screen.getByTestId('profile-edit-nav-basic'));

    const basic = screen.getByTestId('profile-edit-section-basic');
    expect(basic.hidden).toBe(false);
    expect(basic.querySelector('h2')?.textContent).toMatch(/Facts/);
    expect(basic.querySelector('[data-testid="mock-facts-form"]')).toBeTruthy();
    expect(basic.querySelector('[data-testid="mock-photos"]')).toBeNull();
    expect(window.location.pathname + window.location.hash).toBe(
      '/profile/edit#basic',
    );
    expect(screen.getByTestId('profile-edit-section-photos').hidden).toBe(true);
  });

  it('uses the onboarding Facts label in en, es, and he', () => {
    expect(enCopy.profile.hub.editSectionBasic).toBe('Facts');
    expect(enCopy.profile.hub.editSectionBasic).toBe(enCopy.onboarding.tabs.facts);
    expect(esCopy.profile.hub.editSectionBasic).toBe(esCopy.onboarding.tabs.facts);
    expect(heCopy.profile.hub.editSectionBasic).toBe(heCopy.onboarding.tabs.facts);
  });

  it('marks progress dots complete from profile + photos', async () => {
    renderEditTab();
    await waitFor(() => {
      expect(
        screen
          .getByTestId('profile-edit-progress-basic')
          .getAttribute('data-complete'),
      ).toBe('true');
      expect(
        screen
          .getByTestId('profile-edit-progress-photos')
          .getAttribute('data-complete'),
      ).toBe('true');
      expect(
        screen
          .getByTestId('profile-edit-progress-story')
          .getAttribute('data-complete'),
      ).toBe('true');
      expect(
        screen
          .getByTestId('profile-edit-progress-preferences')
          .getAttribute('data-complete'),
      ).toBe('false');
    });
  });

  it('marks Preferences filled when one age is set', async () => {
    fetchMyProfile.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      nickname: 'Noa',
      birthDate: '1990-01-01',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'TLV',
      aboutMe: 'Hello world',
      aboutPartner: '',
      aboutRelationship: '',
      partnerAgeMin: 25,
      partnerAgeMax: null,
      maxDistanceKm: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    renderEditTab();
    await waitFor(() => {
      expect(
        screen
          .getByTestId('profile-edit-progress-preferences')
          .getAttribute('data-complete'),
      ).toBe('true');
    });
  });

  it('marks Preferences filled when only distance is set', async () => {
    fetchMyProfile.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      nickname: 'Noa',
      birthDate: '1990-01-01',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'TLV',
      aboutMe: '',
      aboutPartner: '',
      aboutRelationship: '',
      partnerAgeMin: null,
      partnerAgeMax: null,
      maxDistanceKm: 20,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    renderEditTab();
    await waitFor(() => {
      expect(
        screen
          .getByTestId('profile-edit-progress-preferences')
          .getAttribute('data-complete'),
      ).toBe('true');
    });
  });

  it('clearing Preferences saves null and the dot is no longer filled', async () => {
    const saved = {
      id: 'p1',
      userId: 'u1',
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      nickname: 'Noa',
      birthDate: '1990-01-01',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'TLV',
      aboutMe: 'Hello world',
      aboutPartner: '',
      aboutRelationship: '',
      partnerAgeMin: 25 as number | null,
      partnerAgeMax: 40 as number | null,
      maxDistanceKm: 15 as number | null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    fetchMyProfile.mockResolvedValue(saved);
    patchMyProfile.mockImplementation(async (body: Record<string, unknown>) => {
      const next = { ...saved, ...body };
      fetchMyProfile.mockResolvedValue(next);
      return next;
    });
    window.history.replaceState(null, '', '/profile/edit#preferences');
    renderEditTab();
    const min = await screen.findByTestId('pref-age-min');
    await waitFor(() => {
      expect((min as HTMLInputElement).value).toBe('25');
      expect(
        screen
          .getByTestId('profile-edit-progress-preferences')
          .getAttribute('data-complete'),
      ).toBe('true');
    });
    fireEvent.change(min, { target: { value: '' } });
    fireEvent.change(screen.getByTestId('pref-age-max'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('pref-max-distance'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('profile-edit-preferences-save'));
    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith({
        partnerAgeMin: null,
        partnerAgeMax: null,
        maxDistanceKm: null,
      });
      expect(
        screen
          .getByTestId('profile-edit-progress-preferences')
          .getAttribute('data-complete'),
      ).toBe('false');
    });
  });

  it('nav click switches pane and updates hash', async () => {
    renderEditTab();
    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-nav-story')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('profile-edit-nav-story'));
    expect(screen.getByTestId('profile-edit-section-story').hidden).toBe(false);
    expect(screen.getByTestId('profile-edit-section-basic').hidden).toBe(true);
    expect(window.location.hash).toBe('#story');
    expect(screen.getByTestId('mock-texts-form')).toBeTruthy();
  });

  it('opens preferences pane from #preferences hash', async () => {
    window.history.replaceState(null, '', '/profile/edit#preferences');
    renderEditTab();
    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-section-preferences').hidden).toBe(
        false,
      );
    });
    expect(screen.getByTestId('profile-edit-section-basic').hidden).toBe(true);
    expect(screen.queryByTestId('pref-gender-MALE')).toBeNull();
  });

  it('opens photos pane from #photos hash', async () => {
    window.history.replaceState(null, '', '/profile/edit#photos');
    renderEditTab();
    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-section-photos').hidden).toBe(
        false,
      );
    });
    expect(screen.getByTestId('profile-edit-section-basic').hidden).toBe(true);
  });
});
