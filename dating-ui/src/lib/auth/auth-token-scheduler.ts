import { jwtDecode } from "jwt-decode";

export const REFRESH_LEAD_MS = 60_000;

export type RefreshScheduler = {
  schedule(accessToken: string, onRefresh: () => Promise<void>): void;
  clear(): void;
};

export function createRefreshScheduler(): RefreshScheduler {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(accessToken: string, onRefresh: () => Promise<void>) {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      let refreshIn = 0;
      try {
        const decoded = jwtDecode<{ exp?: number }>(accessToken);
        if (typeof decoded.exp !== "number") return;
        const expiresAtMs = decoded.exp * 1000;
        refreshIn = Math.max(expiresAtMs - Date.now() - REFRESH_LEAD_MS, 0);
      } catch {
        return;
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        void onRefresh();
      }, refreshIn);
    },

    clear() {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}
