/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';

const { resolveEditableProfile, listMyProfilePhotos } = vi.hoisted(() => ({
  resolveEditableProfile: vi.fn(),
  listMyProfilePhotos: vi.fn(),
}));

vi.mock('@/lib/profile-form', async () => {
  const actual = await vi.importActual<typeof import('@/lib/profile-form')>(
    '@/lib/profile-form',
  );
  return {
    ...actual,
    resolveEditableProfile,
  };
});

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

describe('ProfileEditTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/profile?tab=edit');
    listMyProfilePhotos.mockResolvedValue([
      { id: 'p1', status: 'APPROVED', isPrimary: true, position: 0 },
    ]);
    resolveEditableProfile.mockResolvedValue({
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
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows one pane at a time with Basics → Photos → Story nav order', async () => {
    render(<ProfileEditTab />);
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
    render(<ProfileEditTab />);
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
    render(<ProfileEditTab />);
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
    render(<ProfileEditTab />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-section-photos').hidden).toBe(
        false,
      );
    });
    expect(screen.getByTestId('profile-edit-section-basic').hidden).toBe(true);
  });
});
