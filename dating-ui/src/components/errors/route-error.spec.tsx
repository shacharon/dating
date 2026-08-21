/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RouteError } from './route-error';

describe('RouteError', () => {
  it('renders title, message, alert, and non-purple retry', () => {
    const onRetry = vi.fn();
    render(
      <RouteError
        title="Oops"
        message="Try later"
        retryLabel="Try again"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Oops' })).toBeTruthy();
    expect(screen.getByText('Try later')).toBeTruthy();
    const btn = screen.getByRole('button', { name: 'Try again' });
    expect(btn.className).not.toMatch(/purple/);
    expect(btn.className).toMatch(/emerald/);
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
