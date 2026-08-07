/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DatingChapterFields } from '@/components/dating-chapter-fields';
import { enCopy } from '@/lib/i18n/en';

describe('DatingChapterFields', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders modeled EN choices and new_chapter subtext', () => {
    const onChange = vi.fn();
    render(
      <DatingChapterFields
        copy={enCopy.onboarding.basicForm.datingChapter}
        value={null}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Where are you in your dating story?')).toBeTruthy();
    expect(
      screen.getByText(
        'This only changes how we present matches — not who we show.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('dating-chapter-first_chapter')).toBeTruthy();
    expect(screen.getByTestId('dating-chapter-ready_again')).toBeTruthy();
    expect(screen.getByTestId('dating-chapter-new_chapter')).toBeTruthy();
    expect(
      screen.getByText('Divorced, separated, or dating again later in life'),
    ).toBeTruthy();

    fireEvent.click(screen.getByTestId('dating-chapter-ready_again'));
    expect(onChange).toHaveBeenCalledWith('ready_again');
  });

  it('allowClear calls onChange(null)', () => {
    const onChange = vi.fn();
    render(
      <DatingChapterFields
        copy={enCopy.onboarding.basicForm.datingChapter}
        value="new_chapter"
        onChange={onChange}
        allowClear
        clearLabel="Use age-based default"
      />,
    );
    fireEvent.click(screen.getByTestId('dating-chapter-clear'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('Dating chapter i18n', () => {
  it('ships Story 05 HE modeled strings', async () => {
    const { heCopy } = await import('@/lib/i18n/he');
    const ob = heCopy.onboarding.basicForm.datingChapter;
    const settings = heCopy.profile.datingChapter;
    expect(ob.question).toBe('איפה את/ה בסיפור הדייטים שלך?');
    expect(ob.helper).toBe(
      'זה משנה רק איך מציגים לך התאמות — לא את מי מציגים.',
    );
    expect(ob.first_chapter).toBe('בתחילת הדרך');
    expect(ob.ready_again).toBe('מוכן/ה שוב אחרי מערכת יחסים ארוכה');
    expect(ob.new_chapter).toBe('בונה פרק חדש');
    expect(settings.settingsTitle).toBe('פרק הדייטים');
    expect(settings.settingsSubtitle).toBe('לשנות איך נראות כרטיסי ההתאמה');
  });

  it('has no ageist/pity chrome in EN/HE/ES dating chapter copy', async () => {
    const { enCopy } = await import('@/lib/i18n/en');
    const { heCopy } = await import('@/lib/i18n/he');
    const { esCopy } = await import('@/lib/i18n/es');
    const banned =
      /younger|senior|mature singles|second chance|gen[- ]?z|\bold\b/i;
    for (const locale of [enCopy, heCopy, esCopy]) {
      const blobs = [
        ...Object.values(locale.onboarding.basicForm.datingChapter),
        ...Object.values(locale.profile.datingChapter),
      ];
      for (const text of blobs) {
        expect(text).not.toMatch(banned);
      }
    }
  });
});

describe('DatingChapterPreferencesSection', () => {
  const fetchMyProfile = vi.fn();
  const patchMyProfile = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    fetchMyProfile.mockReset();
    patchMyProfile.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads chapter and PATCHes on change', async () => {
    fetchMyProfile.mockResolvedValue({ datingChapter: 'first_chapter' });
    patchMyProfile.mockResolvedValue({ datingChapter: 'new_chapter' });

    vi.doMock('@/lib/me-profile-api', () => ({
      fetchMyProfile,
      patchMyProfile,
    }));
    vi.doMock('@/lib/i18n', async () => {
      const { enCopy } = await import('@/lib/i18n/en');
      return {
        useAppLocale: () => ({ copy: enCopy, locale: 'en' }),
      };
    });

    const { DatingChapterPreferencesSection } = await import(
      '@/components/dating-chapter-preferences-section'
    );
    render(<DatingChapterPreferencesSection />);

    await waitFor(() => {
      expect(
        (screen.getByTestId('dating-chapter-first_chapter') as HTMLInputElement)
          .checked,
      ).toBe(true);
    });

    fireEvent.click(screen.getByTestId('dating-chapter-new_chapter'));
    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith({
        datingChapter: 'new_chapter',
      });
    });
  });
});
