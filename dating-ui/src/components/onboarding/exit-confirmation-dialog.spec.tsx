/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ExitConfirmationDialog } from './exit-confirmation-dialog';
import { enCopy } from '@/lib/i18n/en';

describe('ExitConfirmationDialog', () => {
  const copy = enCopy.onboarding.exitDialog;
  const onCancel = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ExitConfirmationDialog
        open={false}
        copy={copy}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('cancels and confirms', () => {
    render(
      <ExitConfirmationDialog
        open
        copy={copy}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByTestId('onboarding-exit-dialog')).toBeTruthy();
    fireEvent.click(screen.getByTestId('onboarding-exit-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('onboarding-exit-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
