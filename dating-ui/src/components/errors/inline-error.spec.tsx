/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InlineError } from './inline-error';

describe('InlineError', () => {
  it('renders role=alert with message', () => {
    render(<InlineError>Something broke</InlineError>);
    expect(screen.getByRole('alert').textContent).toContain('Something broke');
  });

  it('calls onRetry when retry clicked', () => {
    const onRetry = vi.fn();
    render(
      <InlineError onRetry={onRetry} retryLabel="Retry now">
        Fail
      </InlineError>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry now' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
