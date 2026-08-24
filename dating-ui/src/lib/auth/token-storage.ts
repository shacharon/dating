import { detectPlatform } from "@/lib/platform/platform";
import { CapacitorTokenStorage } from "@/lib/auth/token-storage-capacitor";
import { ReactNativeTokenStorage } from "@/lib/auth/token-storage-react-native";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  type TokenStorage,
} from "@/lib/auth/token-storage-types";

export type { TokenStorage } from "@/lib/auth/token-storage-types";
export { ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY };

function readSessionStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

function removeSessionStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

class WebTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private hydrateAccessFromSession(): void {
    if (this.accessToken != null) return;
    const stored = readSessionStorage(ACCESS_TOKEN_STORAGE_KEY);
    if (stored) this.accessToken = stored;
  }

  private hydrateRefreshFromSession(): void {
    if (this.refreshToken != null) return;
    const stored = readSessionStorage(REFRESH_TOKEN_STORAGE_KEY);
    if (stored) this.refreshToken = stored;
  }

  async getAccessToken(): Promise<string | null> {
    this.hydrateAccessFromSession();
    return this.accessToken;
  }

  async setAccessToken(token: string): Promise<void> {
    this.accessToken = token;
    writeSessionStorage(ACCESS_TOKEN_STORAGE_KEY, token);
  }

  async getRefreshToken(): Promise<string | null> {
    this.hydrateRefreshFromSession();
    return this.refreshToken;
  }

  async setRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;
    writeSessionStorage(REFRESH_TOKEN_STORAGE_KEY, token);
  }

  async setTokenPair(accessToken: string, refreshToken: string): Promise<void> {
    await this.setAccessToken(accessToken);
    await this.setRefreshToken(refreshToken);
  }

  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    removeSessionStorage(ACCESS_TOKEN_STORAGE_KEY);
    removeSessionStorage(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function createTokenStorage(): TokenStorage {
  switch (detectPlatform()) {
    case "capacitor":
      return new CapacitorTokenStorage();
    case "react-native":
      return new ReactNativeTokenStorage();
    default:
      return new WebTokenStorage();
  }
}

export const tokenStorage = createTokenStorage();
