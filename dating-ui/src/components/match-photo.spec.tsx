/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: function MockNextImage(props: {
    src: string;
    unoptimized?: boolean;
    sizes?: string;
    'data-testid'?: string;
    alt?: string;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
  }) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        data-testid={props['data-testid']}
        src={props.src}
        alt={props.alt ?? ''}
        className={props.className}
        data-next-image="1"
        data-unoptimized={props.unoptimized === true ? 'true' : 'false'}
        data-sizes={props.sizes ?? ''}
        onLoad={props.onLoad}
        onError={props.onError}
      />
    );
  },
}));

vi.mock('@/lib/match-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/match-photo')>();
  return {
    ...actual,
    matchPhotoSrc: (url: string | null) => url,
  };
});

import { MatchPhoto } from '@/components/match-photo';

describe('MatchPhoto', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('renders img for relative photo paths (cookie-safe)', () => {
    render(
      <MatchPhoto
        variant="list"
        photoUrl="/api/v1/me/matches/p/photos/1/file"
        displayName="River"
        testId="photo-unit"
      />,
    );
    const img = screen.getByTestId('photo-unit');
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('data-next-image')).toBeNull();
    expect(img.getAttribute('src')).toBe('/api/v1/me/matches/p/photos/1/file');
  });

  it('renders img for absolute API-like hosts when CDN unset', () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTO_CDN_HOSTS', '');
    render(
      <MatchPhoto
        variant="list"
        photoUrl="http://127.0.0.1:3001/api/v1/me/matches/p/photos/1/file"
        displayName="River"
        testId="photo-unit"
      />,
    );
    const img = screen.getByTestId('photo-unit');
    expect(img.getAttribute('data-next-image')).toBeNull();
    expect(img.tagName).toBe('IMG');
  });

  it('renders next/image without unoptimized for CDN hosts', () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTO_CDN_HOSTS', '*.cloudfront.net');
    render(
      <MatchPhoto
        variant="list"
        photoUrl="https://d111.cloudfront.net/photo.jpg"
        displayName="River"
        testId="photo-unit"
      />,
    );
    const img = screen.getByTestId('photo-unit');
    expect(img.getAttribute('data-next-image')).toBe('1');
    expect(img.getAttribute('data-unoptimized')).toBe('false');
    expect(img.getAttribute('data-sizes')).toBe('112px');
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
    expect(screen.getByTestId('photo-unit').getAttribute('src')).toBe(
      '/good.jpg',
    );
  });

  it('renders browse placeholder filling parent sizing classes', () => {
    render(
      <div className="h-[70vh]">
        <MatchPhoto
          variant="browse"
          photoUrl={null}
          displayName="River"
          testId="browse-unit"
        />
      </div>,
    );
    const el = screen.getByTestId('browse-unit');
    expect(el.textContent).toBe('R');
    expect(el.className).toMatch(/h-full/);
    expect(el.className).toMatch(/w-full/);
  });
});
