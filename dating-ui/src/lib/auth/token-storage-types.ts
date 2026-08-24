export interface TokenStorage {
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  setTokenPair(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
}

export const ACCESS_TOKEN_STORAGE_KEY = "dating_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "dating_refresh_token";
