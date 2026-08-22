# Story 04 — Platform Detection + Mobile Stub

**Sprint:** FE-01  
**Effort:** 1-2 days  
**Risk:** 🟢 LOW  
**Status:** ✅ **Done** (2026-08-22) — Phase A; uncommitted on working tree (dating-ui)  
**Depends on:** Story 03 (API client) — **Capacitor chosen** as default mobile platform (see architect handoff)

---

## Objective

Implement **platform-aware token storage** for web and mobile, and create a minimal Android build stub for testing.

**Deliverable:** Token storage works on web (sessionStorage) and mobile (secure storage stub).

---

## Current State

**Token storage only supports web:**

```typescript
// dating-ui/src/lib/token-storage.ts
class WebTokenStorage implements TokenStorage {
  async getAccessToken() {
    return sessionStorage.getItem('accessToken');
  }
  // ...
}

export const tokenStorage = new WebTokenStorage(); // ← Hardcoded web
```

**Problem:** Mobile apps (Capacitor, React Native) need OS-native secure storage (Keychain, Keystore), not `sessionStorage`.

---

## Target State

```typescript
// dating-ui/src/lib/token-storage.ts
export const tokenStorage = createTokenStorage(); // ← Factory

// Automatically chooses:
// - WebTokenStorage (if browser)
// - CapacitorTokenStorage (if Capacitor)
// - ReactNativeTokenStorage (if React Native)
```

---

## Implementation Steps

### 1. Create Platform Detection Utility

**File:** `dating-ui/src/lib/platform.ts`

```typescript
export type Platform = 'web' | 'capacitor' | 'react-native';

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'web'; // SSR fallback
  }

  // Check for Capacitor
  if ((window as any).Capacitor) {
    return 'capacitor';
  }

  // Check for React Native
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'react-native';
  }

  return 'web';
}

export const currentPlatform = detectPlatform();

export const isWeb = currentPlatform === 'web';
export const isMobile = currentPlatform === 'capacitor' || currentPlatform === 'react-native';
export const isCapacitor = currentPlatform === 'capacitor';
export const isReactNative = currentPlatform === 'react-native';
```

---

### 2. Update Token Storage (Platform Factory)

**File:** `dating-ui/src/lib/token-storage.ts`

```typescript
import { detectPlatform } from './platform';

export interface TokenStorage {
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clearTokens(): Promise<void>;
}

// Web implementation
class WebTokenStorage implements TokenStorage {
  async getAccessToken() {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('accessToken');
  }

  async setAccessToken(token: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accessToken', token);
    }
  }

  async getRefreshToken() {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('refreshToken');
  }

  async setRefreshToken(token: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('refreshToken', token);
    }
  }

  async clearTokens() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
    }
  }
}

// Capacitor implementation (iOS/Android secure storage)
class CapacitorTokenStorage implements TokenStorage {
  async getAccessToken() {
    if (typeof window === 'undefined' || !(window as any).Capacitor) return null;

    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key: 'accessToken' });
      return value;
    } catch (err) {
      console.error('Capacitor storage error:', err);
      return null;
    }
  }

  async setAccessToken(token: string) {
    if (typeof window === 'undefined' || !(window as any).Capacitor) return;

    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key: 'accessToken', value: token });
    } catch (err) {
      console.error('Capacitor storage error:', err);
    }
  }

  async getRefreshToken() {
    if (typeof window === 'undefined' || !(window as any).Capacitor) return null;

    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key: 'refreshToken' });
      return value;
    } catch (err) {
      console.error('Capacitor storage error:', err);
      return null;
    }
  }

  async setRefreshToken(token: string) {
    if (typeof window === 'undefined' || !(window as any).Capacitor) return;

    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key: 'refreshToken', value: token });
    } catch (err) {
      console.error('Capacitor storage error:', err);
    }
  }

  async clearTokens() {
    if (typeof window === 'undefined' || !(window as any).Capacitor) return;

    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key: 'accessToken' });
      await Preferences.remove({ key: 'refreshToken' });
    } catch (err) {
      console.error('Capacitor storage error:', err);
    }
  }
}

// React Native implementation (Keychain)
class ReactNativeTokenStorage implements TokenStorage {
  async getAccessToken() {
    try {
      const Keychain = await import('react-native-keychain');
      const credentials = await Keychain.default.getGenericPassword({ service: 'accessToken' });
      return credentials ? credentials.password : null;
    } catch (err) {
      console.error('Keychain error:', err);
      return null;
    }
  }

  async setAccessToken(token: string) {
    try {
      const Keychain = await import('react-native-keychain');
      await Keychain.default.setGenericPassword('accessToken', token, { service: 'accessToken' });
    } catch (err) {
      console.error('Keychain error:', err);
    }
  }

  async getRefreshToken() {
    try {
      const Keychain = await import('react-native-keychain');
      const credentials = await Keychain.default.getGenericPassword({ service: 'refreshToken' });
      return credentials ? credentials.password : null;
    } catch (err) {
      console.error('Keychain error:', err);
      return null;
    }
  }

  async setRefreshToken(token: string) {
    try {
      const Keychain = await import('react-native-keychain');
      await Keychain.default.setGenericPassword('refreshToken', token, { service: 'refreshToken' });
    } catch (err) {
      console.error('Keychain error:', err);
    }
  }

  async clearTokens() {
    try {
      const Keychain = await import('react-native-keychain');
      await Keychain.default.resetGenericPassword({ service: 'accessToken' });
      await Keychain.default.resetGenericPassword({ service: 'refreshToken' });
    } catch (err) {
      console.error('Keychain error:', err);
    }
  }
}

// Factory
export function createTokenStorage(): TokenStorage {
  const platform = detectPlatform();

  switch (platform) {
    case 'capacitor':
      return new CapacitorTokenStorage();
    case 'react-native':
      return new ReactNativeTokenStorage();
    default:
      return new WebTokenStorage();
  }
}

export const tokenStorage = createTokenStorage();
```

---

### 3. Install Mobile Dependencies

**For Capacitor:**

```bash
npm install @capacitor/core @capacitor/preferences
npm install -D @capacitor/cli

# Initialize Capacitor
npx cap init

# Add Android platform
npx cap add android
```

**For React Native:**

```bash
npm install react-native-keychain
```

**Note:** Final decision depends on **FE Sprint 03** (Android Shell Decision).

---

### 4. Create Capacitor Config (If Capacitor Chosen)

**File:** `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.dating',
  appName: 'Dating App',
  webDir: 'out', // Next.js static export
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

---

### 5. Update Next.js for Static Export (Capacitor)

**File:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static HTML export for Capacitor
  images: {
    unoptimized: true // Capacitor doesn't support Next.js Image Optimization API
  }
};

module.exports = nextConfig;
```

---

### 6. Build and Test Android Stub

**Capacitor:**

```bash
# Build Next.js static site
npm run build

# Copy build to Capacitor
npx cap sync

# Open Android Studio
npx cap open android

# Run on emulator or device
```

**React Native:**

```bash
# Build Android APK
npx react-native run-android
```

---

## Testing

### Web Testing

1. **Browser:** Token storage uses `sessionStorage`
2. **Verify:**
   - Login → tokens stored in sessionStorage
   - Page reload → tokens persist
   - Logout → tokens cleared

### Mobile Testing (Capacitor)

1. **Android emulator:** Run `npx cap open android`
2. **Verify:**
   - Login → tokens stored in Capacitor Preferences
   - App restart → tokens persist
   - Logout → tokens cleared
3. **Check logs:** `adb logcat | grep -i token`

### Mobile Testing (React Native)

1. **Android emulator:** Run `npx react-native run-android`
2. **Verify:**
   - Login → tokens stored in Keychain
   - App restart → tokens persist
   - Logout → tokens cleared

---

## Files Changed

- ✅ `dating-ui/src/lib/platform.ts` (new)
- ✅ `dating-ui/src/lib/token-storage.ts` (platform factory)
- ✅ `capacitor.config.ts` (new, if Capacitor)
- ✅ `next.config.js` (update for static export, if Capacitor)
- ✅ `android/` folder (generated by Capacitor or React Native)
- ✅ `package.json` (add mobile deps)

---

## Success Criteria

### Phase A (Story 4 DoD — Done)

- [x] Platform detection works (`detectPlatform()` — unit tests)
- [x] Web: tokens stored in sessionStorage (unchanged)
- [x] Capacitor: tokens stored in `@capacitor/preferences` (+ in-memory cache)
- [x] React Native: stub (reads null; Keychain deferred until RN app exists)
- [x] Auth regression tests pass with platform storage (37 tests)

### Phase B (deferred — Android shell sprint)

- [ ] Android build runs (emulator or device)
- [ ] Login flow works on Android (GIS / native auth)
- [ ] App restart preserves auth state on device
- [ ] Upgrade Preferences → Secure Storage before prod store

---

## Platform decision (resolved)

**Capacitor** is the default mobile platform for FE-01. React Native branch is a no-op stub.

**Note:** Repo `fe-sprint-03` is **socket token auth**, not Android shell. Phase B (`cap init`, `android/`) is a separate Android shell effort.
