/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyProfile, listMyProfilePhotos } = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  listMyProfilePhotos: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    profile: {
      fetchMyProfile,
      patchMyProfile: vi.fn(),
      createMyProfile: vi.fn(),
      submitMyProfileForAnalysis: vi.fn(),
    },
  },
}));

vi.mock('@/lib/me-photos-api', () => ({
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

vi.mock('@/components/onboarding-basic-form', () => ({
  OnboardingBasicForm: () => <div data-testid="mock-basic-form">basic</div>,
}));
vi.mock('@/components/onboarding-texts-form', () => ({
  OnboardingTextsForm: () => <div data-testid="mock-texts-form">texts</div>,
}));
vi.mock('@/components/profile-photo-section', () => ({
  ProfilePhotoSection: () => <div data-testid="mock-photos">photos</div>,
}));

import { ProfileEditTab } from '@/components/profile/profile-edit-tab';

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
    window.history.replaceState(null, '', '/profile?tab=edit');
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

  it('shows one pane at a time with Basics → Photos → Story nav order', async () => {
    renderEditTab();
    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-tab')).toBeTruthy();
      expect(screen.getByTestId('profile-edit-section-nav')).toBeTruthy();
    });

    const navButtons = [
      screen.getByTestId('profile-edit-nav-basic'),
      screen.getByTestId('profile-edit-nav-photos'),
      screen.getByTestId('profile-edit-nav-story'),
    ];
    expect(
      navButtons[0]!.compareDocumentPosition(navButtons[1]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      navButtons[1]!.compareDocumentPosition(navButtons[2]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.getByTestId('profile-edit-section-basic').hidden).toBe(false);
    expect(screen.getByTestId('profile-edit-section-photos').hidden).toBe(true);
    expect(screen.getByTestId('profile-edit-section-story').hidden).toBe(true);
    expect(screen.getByTestId('mock-basic-form')).toBeTruthy();
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

  it('opens photos pane from #photos hash', async () => {
    window.history.replaceState(null, '', '/profile?tab=edit#photos');
    renderEditTab();
    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-section-photos').hidden).toBe(
        false,
      );
    });
    expect(screen.getByTestId('profile-edit-section-basic').hidden).toBe(true);
  });
});
