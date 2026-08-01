/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  countWords,
  OnboardingTextFieldHelp,
} from './onboarding-text-field-help';
import { enCopy } from '@/lib/i18n/en';

const chrome = enCopy.onboarding.textsForm.writingHelp;
const field = enCopy.onboarding.writingPrompts.aboutMe;

afterEach(() => {
  cleanup();
});

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  one  two\nthree ')).toBe(3);
  });
});

describe('OnboardingTextFieldHelp', () => {
  it('shows word count and ideas without expanding', () => {
    render(
      <OnboardingTextFieldHelp
        value="hello world"
        field={field}
        chrome={chrome}
        testIdPrefix="ot-about-me"
      />,
    );

    expect(screen.getByTestId('ot-about-me-word-count').textContent).toBe(
      chrome.wordCountLine(2),
    );
    expect(screen.getByText(chrome.ideasHeading)).toBeTruthy();
    expect(screen.getByText(field.questions[0])).toBeTruthy();
    expect(screen.queryByTestId('ot-about-me-examples-panel')).toBeNull();
    expect(screen.queryByTestId('ot-about-me-tips-panel')).toBeNull();
  });

  it('toggles examples and tips panels', () => {
    render(
      <OnboardingTextFieldHelp
        value=""
        field={field}
        chrome={chrome}
        testIdPrefix="ot-about-me"
      />,
    );

    fireEvent.click(screen.getByTestId('ot-about-me-examples-toggle'));
    expect(screen.getByTestId('ot-about-me-examples-panel')).toBeTruthy();
    expect(screen.getByText(field.examples[0])).toBeTruthy();
    expect(screen.getByTestId('ot-about-me-examples-toggle').textContent).toBe(
      chrome.hideExamples,
    );

    fireEvent.click(screen.getByTestId('ot-about-me-examples-toggle'));
    expect(screen.queryByTestId('ot-about-me-examples-panel')).toBeNull();

    fireEvent.click(screen.getByTestId('ot-about-me-tips-toggle'));
    expect(screen.getByTestId('ot-about-me-tips-panel')).toBeTruthy();
    expect(screen.getByText(chrome.includeHeading)).toBeTruthy();
    expect(screen.getByText(field.include[0])).toBeTruthy();
  });

  it('has no emoji in chrome or body', () => {
    render(
      <OnboardingTextFieldHelp
        value=""
        field={field}
        chrome={chrome}
        testIdPrefix="ot-about-me"
      />,
    );
    fireEvent.click(screen.getByTestId('ot-about-me-examples-toggle'));
    fireEvent.click(screen.getByTestId('ot-about-me-tips-toggle'));
    expect(screen.getByTestId('ot-about-me-writing-help').textContent).not.toMatch(
      /💡|⚠️/,
    );
  });
});
