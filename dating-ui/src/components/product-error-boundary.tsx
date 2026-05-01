'use client';

import { emitProductLog } from '@/lib/observability/product-logger';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';
import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

/**
 * Catches render errors under product/auth/profile surfaces so the app can show a fallback
 * and emit one structured fatal log.
 */
export class ProductErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const route =
      typeof window !== 'undefined' ? window.location.pathname : '(ssr)';
    emitProductLog({
      level: 'fatal',
      route,
      message: error.message || 'Render error',
      errorCode: UiErrorCodes.UI_RENDER_FATAL,
      meta: {
        name: error.name,
        componentStack: info.componentStack,
      },
    });
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="mx-auto max-w-lg p-8 font-sans">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This part of the app hit an unexpected error. Refresh the page or go
            back to home.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
