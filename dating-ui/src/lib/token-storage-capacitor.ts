import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  type TokenStorage,
} from "@/lib/token-storage-types";

type PreferencesApi = {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
};

let preferencesLoadFailed = false;
let preferencesLoadWarned = false;

async function loadPreferences(): Promise<PreferencesApi | null> {
  if (preferencesLoadFailed) {
    return null;
  }
  try {
    const mod = await import("@capacitor/preferences");
    return mod.Preferences;
  } catch {
    preferencesLoadFailed = true;
    if (
      process.env.NODE_ENV !== "production" &&
      !preferencesLoadWarned
    ) {
      preferencesLoadWarned = true;
      console.warn(
        "Capacitor Preferences unavailable — token storage is in-memory only",
      );
    }
    return null;
  }
}

export class CapacitorTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private async hydrateAccessFromPreferences(): Promise<void> {
    if (this.accessToken != null) return;
    const preferences = await loadPreferences();
    if (!preferences) return;
    try {
      const { value } = await preferences.get({
        key: ACCESS_TOKEN_STORAGE_KEY,
      });
      if (value) this.accessToken = value;
    } catch {
      /* read failure — in-memory only */
    }
  }

  private async hydrateRefreshFromPreferences(): Promise<void> {
    if (this.refreshToken != null) return;
    const preferences = await loadPreferences();
    if (!preferences) return;
    try {
      const { value } = await preferences.get({
        key: REFRESH_TOKEN_STORAGE_KEY,
      });
      if (value) this.refreshToken = value;
    } catch {
      /* read failure — in-memory only */
    }
  }

  async getAccessToken(): Promise<string | null> {
    await this.hydrateAccessFromPreferences();
    return this.accessToken;
  }

  async setAccessToken(token: string): Promise<void> {
    this.accessToken = token;
    const preferences = await loadPreferences();
    if (!preferences) return;
    try {
      await preferences.set({ key: ACCESS_TOKEN_STORAGE_KEY, value: token });
    } catch {
      /* persist failure — in-memory cache retained */
    }
  }

  async getRefreshToken(): Promise<string | null> {
    await this.hydrateRefreshFromPreferences();
    return this.refreshToken;
  }

  async setRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;
    const preferences = await loadPreferences();
    if (!preferences) return;
    try {
      await preferences.set({ key: REFRESH_TOKEN_STORAGE_KEY, value: token });
    } catch {
      /* persist failure — in-memory cache retained */
    }
  }

  async setTokenPair(accessToken: string, refreshToken: string): Promise<void> {
    await this.setAccessToken(accessToken);
    await this.setRefreshToken(refreshToken);
  }

  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    const preferences = await loadPreferences();
    if (!preferences) return;
    try {
      await preferences.remove({ key: ACCESS_TOKEN_STORAGE_KEY });
      await preferences.remove({ key: REFRESH_TOKEN_STORAGE_KEY });
    } catch {
      /* ignore */
    }
  }
}

/** Reset module-level Preferences load state between tests. */
export function resetCapacitorTokenStorageForTests(): void {
  preferencesLoadFailed = false;
  preferencesLoadWarned = false;
}
