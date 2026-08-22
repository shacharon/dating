export type Platform = "web" | "capacitor" | "react-native";

const PLATFORMS: Platform[] = ["web", "capacitor", "react-native"];

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

let platformOverride: Platform | null = null;

function parseEnvPlatform(): Platform | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const raw = process.env.NEXT_PUBLIC_PLATFORM?.trim().toLowerCase();
  if (!raw) return null;
  if (PLATFORMS.includes(raw as Platform)) {
    return raw as Platform;
  }
  return null;
}

function isCapacitorRuntime(): boolean {
  const cap = (window as CapacitorWindow).Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function") {
    return cap.isNativePlatform();
  }
  return true;
}

/** SSR / RSC: always web. */
export function detectPlatform(): Platform {
  if (platformOverride) {
    return platformOverride;
  }

  const envPlatform = parseEnvPlatform();
  if (envPlatform) {
    return envPlatform;
  }

  if (typeof window === "undefined") {
    return "web";
  }

  if (isCapacitorRuntime()) {
    return "capacitor";
  }

  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
    return "react-native";
  }

  return "web";
}

/** Vitest only — reset in afterEach. */
export function setPlatformOverrideForTests(platform: Platform | null): void {
  platformOverride = platform;
}

export function isWeb(): boolean {
  return detectPlatform() === "web";
}

export function isCapacitor(): boolean {
  return detectPlatform() === "capacitor";
}

export function isReactNative(): boolean {
  return detectPlatform() === "react-native";
}

export function isMobile(): boolean {
  const platform = detectPlatform();
  return platform === "capacitor" || platform === "react-native";
}
