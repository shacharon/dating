export interface CreateSessionMetadata {
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreateSessionResult {
  /** Returned once for Set-Cookie; never stored or logged by this service. */
  rawToken: string;
  sessionId: string;
  expiresAt: Date;
}

/** Active session after successful validation. */
export interface ValidatedSession {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}
