import * as Sentry from '@sentry/node';
import {
  buildSentryInitOptions,
  readSentryDsnFromEnv,
} from './observability/sentry-init-options';

const dsn = readSentryDsnFromEnv();
if (dsn) {
  Sentry.init(buildSentryInitOptions({ dsn }));
}
