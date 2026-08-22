import type { TokenStorage } from "@/lib/token-storage-types";

let stubWarned = false;

function warnStubOnce(): void {
  if (stubWarned || process.env.NODE_ENV === "production") {
    return;
  }
  stubWarned = true;
  console.warn(
    "React Native token storage not implemented — Story 4 stub (use react-native-keychain when RN app exists)",
  );
}

/** Placeholder until a React Native app repo adds Keychain storage. */
export class ReactNativeTokenStorage implements TokenStorage {
  async getAccessToken(): Promise<string | null> {
    return null;
  }

  async setAccessToken(_token: string): Promise<void> {
    warnStubOnce();
  }

  async getRefreshToken(): Promise<string | null> {
    return null;
  }

  async setRefreshToken(_token: string): Promise<void> {
    warnStubOnce();
  }

  async setTokenPair(_accessToken: string, _refreshToken: string): Promise<void> {
    warnStubOnce();
  }

  async clearTokens(): Promise<void> {
    /* no-op */
  }
}

export function resetReactNativeTokenStorageForTests(): void {
  stubWarned = false;
}
