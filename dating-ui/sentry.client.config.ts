import * as Sentry from '@sentry/nextjs';
import { getSentryUiOptions } from './sentry.shared.config';

Sentry.init(getSentryUiOptions());
