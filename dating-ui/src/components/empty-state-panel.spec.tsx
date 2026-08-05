/** @vitest-environment jsdom */
import { describe, expect, it, vi, type ReactNode } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { EmptyStatePanel } from './empty-state-panel';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('EmptyStatePanel', () => {
  it('renders title, description, and button CTA', () => {
    const onClick = vi.fn();
    const { getByTestId, getByText } = render(
      <EmptyStatePanel
        testId="empty-panel"
        title="Nothing here"
        description="Try something else."
        primaryAction={{
          label: 'Try again',
          onClick,
          testId: 'empty-primary',
        }}
        secondaryAction={{
          label: 'Learn more',
          href: '/about/algorithm',
          testId: 'empty-secondary',
        }}
      />,
    );

    expect(getByTestId('empty-panel')).toBeTruthy();
    expect(getByText('Nothing here')).toBeTruthy();
    expect(getByText('Try something else.')).toBeTruthy();
    fireEvent.click(getByTestId('empty-primary'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(getByTestId('empty-secondary').getAttribute('href')).toBe(
      '/about/algorithm',
    );
  });

  it('supports role=alert for error panels', () => {
    const { getByTestId } = render(
      <EmptyStatePanel testId="err" title="Oops" role="alert" />,
    );
    expect(getByTestId('err').getAttribute('role')).toBe('alert');
  });
});
