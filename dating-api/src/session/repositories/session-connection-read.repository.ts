export const SESSION_CONNECTION_READ = Symbol('SESSION_CONNECTION_READ');

export interface ISessionConnectionReadRepository {
  /** Session row exists, not revoked, not expired. */
  isSessionRowActive(sessionId: string): Promise<boolean>;

  /** User exists, not soft-deleted, status ACTIVE (AuthGuard parity). */
  isUserActiveForConnection(userId: string): Promise<boolean>;
}
