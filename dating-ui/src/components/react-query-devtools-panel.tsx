'use client';

import dynamic from 'next/dynamic';

const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then((mod) => ({
      default: mod.ReactQueryDevtools,
    })),
  { ssr: false },
);

export function isReactQueryDevtoolsEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === 'development';
}

export function ReactQueryDevtoolsPanel() {
  if (!isReactQueryDevtoolsEnabled()) {
    return null;
  }
  return <ReactQueryDevtools initialIsOpen={false} />;
}
