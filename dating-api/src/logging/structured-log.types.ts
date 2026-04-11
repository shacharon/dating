export type StructuredLogLevel = 'trace' | 'error' | 'fatal';

export type StructuredLogLine = {
  timestamp: string;
  level: StructuredLogLevel;
  service: string;
  env: string;
  requestId: string | null;
  route: string | null;
  method: string | null;
  userId: string | null;
  sessionId: string | null;
  message: string;
  errorCode?: string;
  stack?: string;
};
