/**
 * Normalized Google OIDC identity (verified server-side).
 * Used for user create/update on login — Google-only path for now.
 */
export interface GoogleIdentity {
  googleId: string;
  /** Normalized by {@link GoogleAuthService.verifyIdToken}: trimmed + lowercased. */
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}
