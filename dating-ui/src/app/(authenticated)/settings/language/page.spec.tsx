/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  APP_LOCALE_STORAGE_KEY,
} from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';
import SettingsLanguagePage from './language-page-client';

describe('SettingsLanguagePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders localized language settings copy in English by default', () => {
    render(<SettingsLanguagePage />);

    expect(
      screen.getByRole('heading', { name: enCopy.languageSettings.title }),
    ).toBeTruthy();
    expect(screen.getByLabelText(enCopy.languageSettings.label)).toBeTruthy();
    expect(screen.getByText(enCopy.languageSettings.description)).toBeTruthy();
  });

  it('persists locale when user changes language', () => {
    render(<SettingsLanguagePage />);

    fireEvent.change(screen.getByLabelText(enCopy.languageSettings.label), {
      target: { value: 'he' },
    });

    expect(localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe('he');
    expect(
      screen.getByRole('heading', { name: heCopy.languageSettings.title }),
    ).toBeTruthy();
  });
});
