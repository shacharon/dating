/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ProductErrorBoundary } from './product-error-boundary';

function ThrowOnce({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('boom-render');
  }
  return createElement('span', null, 'ok');
}

describe('ProductErrorBoundary', () => {
  it('emits one fatal log and shows fallback when a child throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);
    await act(async () => {
      root.render(
        createElement(
          ProductErrorBoundary,
          null,
          createElement(ThrowOnce, { shouldThrow: true }),
        ),
      );
    });
    const fatalLines = errSpy.mock.calls
      .map((c) => c[0])
      .filter(
        (msg) =>
          typeof msg === 'string' &&
          msg.includes('"level":"fatal"') &&
          msg.includes('UI_RENDER_FATAL'),
      );
    expect(fatalLines.length).toBeGreaterThanOrEqual(1);
    expect(div.textContent).toContain('Something went wrong');
    expect(div.textContent).toContain('boom-render');
    root.unmount();
    div.remove();
    errSpy.mockRestore();
  });
});
