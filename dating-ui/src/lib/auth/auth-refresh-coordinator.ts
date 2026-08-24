import { refreshAccessToken } from "@/lib/auth/auth-api";
import { tokenStorage } from "@/lib/auth/token-storage";

export class AuthRefreshError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Token refresh failed (${status})`);
    this.name = "AuthRefreshError";
    this.status = status;
  }
}

let refreshPromise: Promise<string> | null = null;

export async function coordinateRefreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new AuthRefreshError(401, "No refresh token");
    }

    const rotated = await refreshAccessToken(refreshToken);
    if (!rotated.ok) {
      throw new AuthRefreshError(rotated.status);
    }

    await tokenStorage.setTokenPair(
      rotated.accessToken,
      rotated.refreshToken,
    );
    return rotated.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export function resetRefreshCoordinatorForTests(): void {
  refreshPromise = null;
}
