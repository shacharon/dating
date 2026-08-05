/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/i18n', () => ({
  useAppLocale: () => ({
    copy: {
      landing: { brand: 'Piza' },
      support: {
        title: 'Get help',
        subtitle: 'Tell us what’s going wrong.',
        issueTypeLabel: 'What’s wrong?',
        issueTypes: {
          matches: 'Can’t see matches',
          photo: 'Photo upload failed',
          conversation: 'Conversation not loading',
          bug: 'Other bug',
          feature: 'Feature request',
          other: 'Something else',
        },
        descriptionLabel: 'Describe the issue',
        descriptionPlaceholder: 'What happened?',
        emailLabel: 'Your email',
        emailPlaceholder: 'you@example.com',
        submit: 'Open email to send',
        missingEmailConfig: 'Support email isn’t configured yet.',
        mailtoHint: 'Opens your mail app',
        slaHint: 'We aim to reply within 24 hours.',
      },
    },
  }),
}));

vi.mock('next/link', () => ({
  default({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

const buildSupportMailto = vi.fn(
  () => 'mailto:support@piza.test?subject=test',
);

vi.mock('@/lib/support-mailto', () => ({
  getSupportOpsEmail: () => 'support@piza.test',
  buildSupportMailto: (...args: unknown[]) => buildSupportMailto(...args),
}));

import SupportPageClient from './support-page-client';

describe('SupportPageClient', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('calls buildSupportMailto and navigates on submit', () => {
    const hrefSetter = vi.fn();
    vi.stubGlobal(
      'location',
      new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === 'href') return '';
            return undefined;
          },
          set(_t, prop, value) {
            if (prop === 'href') {
              hrefSetter(value);
              return true;
            }
            return false;
          },
        },
      ),
    );

    render(<SupportPageClient />);
    fireEvent.change(screen.getByTestId('support-issue-type'), {
      target: { value: 'photo' },
    });
    fireEvent.change(screen.getByTestId('support-description'), {
      target: { value: 'Upload stuck' },
    });
    fireEvent.change(screen.getByTestId('support-reply-email'), {
      target: { value: 'me@example.com' },
    });
    fireEvent.submit(screen.getByTestId('support-form'));

    expect(buildSupportMailto).toHaveBeenCalledWith({
      to: 'support@piza.test',
      issueTypeLabel: 'Photo upload failed',
      description: 'Upload stuck',
      replyEmail: 'me@example.com',
    });
    expect(hrefSetter).toHaveBeenCalledWith(
      'mailto:support@piza.test?subject=test',
    );
  });
});
