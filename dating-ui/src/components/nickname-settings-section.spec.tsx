/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';
import { enCopy } from '@/lib/i18n/en';

const { fetchMyProfile, patchMyProfile } = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
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

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { displayName: 'Google Person' } }),
}));

import { NicknameSettingsSection } from '@/components/nickname-settings-section';

function renderSection() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(NicknameSettingsSection),
    ),
  );
}

describe('NicknameSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyProfile.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      nickname: 'Noa',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    patchMyProfile.mockImplementation(async (body) => ({
      id: 'p1',
      userId: 'u1',
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      nickname: body.nickname ?? null,
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('loads existing nickname and PATCHes on save', async () => {
    renderSection();
    const ns = enCopy.profile.nicknameSettings;

    await waitFor(() => {
      expect(
        (screen.getByLabelText(ns.nicknameLabel) as HTMLInputElement).value,
      ).toBe('Noa');
    });
    expect(screen.getByText('Google Person')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(ns.nicknameLabel), {
      target: { value: 'Noa2' },
    });
    fireEvent.click(screen.getByTestId('nickname-settings-save'));

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith({ nickname: 'Noa2' });
    });
    expect(screen.getByText(ns.savedFlash)).toBeTruthy();
  });

  it('shows field error when nickname is taken', async () => {
    patchMyProfile.mockRejectedValue(
      new Error(
        'This nickname is already taken. Choose a different one or leave it blank.',
      ),
    );
    renderSection();
    const ns = enCopy.profile.nicknameSettings;

    await waitFor(() => {
      expect(screen.getByLabelText(ns.nicknameLabel)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(ns.nicknameLabel), {
      target: { value: 'Taken' },
    });
    fireEvent.click(screen.getByTestId('nickname-settings-save'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        ns.nicknameTakenError,
      );
    });
  });
});
