/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MatchPhoto } from '@/components/match-photo';

vi.mock('@/lib/match-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/match-photo')>();
  return {
    ...actual,
    matchPhotoSrc: (url: string | null) => url,
  };
});

describe('MatchPhoto', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders img when photoUrl is set', () => {
    render(
      <MatchPhoto
        variant="list"
        photoUrl="/photos/1/file"
        displayName="River"
        testId="photo-unit"
      />,
    );
    const img = screen.getByTestId('photo-unit');
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('/photos/1/file');
  });

  it('renders placeholder when photoUrl is null', () => {
    render(
      <MatchPhoto
        variant="list"
        photoUrl={null}
        displayName="River"
        testId="photo-unit"
      />,
    );
    expect(screen.getByTestId('photo-unit').textContent).toBe('R');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('falls back to placeholder on image error', () => {
    render(
      <MatchPhoto
        variant="list"
        photoUrl="/bad.jpg"
        displayName="River"
        testId="photo-unit"
      />,
    );
    fireEvent.error(screen.getByTestId('photo-unit'));
    expect(screen.getByTestId('photo-unit').textContent).toBe('R');
  });

  it('retries image when photoUrl changes after error', () => {
    const { rerender } = render(
      <MatchPhoto
        variant="list"
        photoUrl="/bad.jpg"
        displayName="River"
        testId="photo-unit"
      />,
    );
    fireEvent.error(screen.getByTestId('photo-unit'));
    expect(screen.getByTestId('photo-unit').textContent).toBe('R');

    rerender(
      <MatchPhoto
        variant="list"
        photoUrl="/good.jpg"
        displayName="River"
        testId="photo-unit"
      />,
    );
    expect(screen.getByTestId('photo-unit').tagName).toBe('IMG');
    expect(screen.getByTestId('photo-unit').getAttribute('src')).toBe('/good.jpg');
  });
});
