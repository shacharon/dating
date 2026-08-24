/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { ContentModerationErrorAlert } from './content-moderation-error-alert';
import type { ContentModerationDetails } from '@/lib/moderation/content-moderation-error';

const labels = {
  fieldLabel: 'Field',
  flaggedLabel: 'Flagged',
  whyLabel: 'Why',
  suggestionLabel: 'Suggestion',
  exampleLabel: 'Example',
  mutedLabel: 'Messaging restricted',
  dismiss: 'Dismiss',
};

const fullDetails: ContentModerationDetails = {
  field: 'aboutPartner',
  category: 'sexual',
  flaggedText: 'wanna fuck',
  reason: 'Direct sexual solicitation',
  suggestion: 'Describe connection or interests.',
  exampleAlternative: 'Looking for someone adventurous',
  muted: '1 hour',
};

afterEach(() => {
  cleanup();
});

describe('ContentModerationErrorAlert', () => {
  it('renders profile rows including field, flagged, why, suggestion, example', () => {
    render(
      <ContentModerationErrorAlert
        details={fullDetails}
        variant="profile"
        title="We found an issue with your profile text"
        fieldLabel="About my ideal partner"
        labels={labels}
      />,
    );

    const alert = screen.getByTestId('content-moderation-error-alert');
    expect(alert.textContent).toContain(
      'We found an issue with your profile text',
    );
    expect(alert.textContent).toContain('About my ideal partner');
    expect(alert.textContent).toContain('wanna fuck');
    expect(alert.textContent).toContain('Direct sexual solicitation');
    expect(alert.textContent).toContain('Describe connection or interests.');
    expect(alert.textContent).toContain('Looking for someone adventurous');
    expect(alert.querySelector('a')).toBeNull();
    expect(alert.textContent).not.toMatch(/⚠️|💡/);
  });

  it('hides field for message variant and shows muted', () => {
    render(
      <ContentModerationErrorAlert
        details={fullDetails}
        variant="message"
        title="We found an issue with your message"
        fieldLabel="About my ideal partner"
        labels={labels}
      />,
    );

    const alert = screen.getByTestId('content-moderation-error-alert');
    expect(alert.textContent).not.toContain('About my ideal partner');
    expect(alert.textContent).toContain('1 hour');
    expect(alert.textContent).toContain('Messaging restricted');
  });

  it('calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(
      <ContentModerationErrorAlert
        details={fullDetails}
        variant="profile"
        title="Issue"
        labels={labels}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByTestId('content-moderation-error-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
