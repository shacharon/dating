# Story 02 — Frontend Auth Context + Token Storage

**Sprint:** FE-01  
**Effort:** 2-3 days  
**Risk:** 🟡 MEDIUM (need to handle race conditions on refresh)  
**Status:** Done  
**Depends on:** Story 01 (backend token endpoints)

---

## Objective

Create a **React auth context** that stores tokens, manages login/logout, and handles auto-refresh logic.

**Deliverable:** `AuthProvider` + `useAuth()` hook that works for web and mobile.

---

## Current State

**No centralized auth state.** Login/logout logic is scattered:

```typescript
// dating-ui/src/app/login/page.tsx
const handleLogin = async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include', // Cookie-based
    body: JSON.stringify({ email, password })
  });
  
  if (res.ok) {
    router.push('/dating/me-matches');
  }
};
```

**Problem:** 
- No token storage
- No auto-refresh
- No centralized auth state (can't check `isAuthenticated` globally)

---

## Target State

```typescript
// dating-ui/src/app/login/page.tsx
const { login } = useAuth();

const handleLogin = async () => {
  await login(email, password);
  router.push('/dating/me-matches');
};

// dating-ui/src/app/layout.tsx
const { isAuthenticated, user } = useAuth();

if (!isAuthenticated) {
  return <LoginPage />;
}
```

---

## Implementation Steps

### 1. Create Token Storage Utility

**File:** `dating-ui/src/lib/token-storage.ts`

```typescript
// Platform-aware token storage

export interface TokenStorage {
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clearTokens(): Promise<void>;
}

// Web implementation (in-memory or sessionStorage)
class WebTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async getAccessToken() {
    return this.accessToken;
  }

  async setAccessToken(token: string) {
    this.accessToken = token;
    // Optional: store in sessionStorage for page reload persistence
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accessToken', token);
    }
  }

  async getRefreshToken() {
    return this.refreshToken;
  }

  async setRefreshToken(token: string) {
    this.refreshToken = token;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('refreshToken', token);
    }
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
    }
  }
}

// Mobile implementation (stub for now, Story 4 will add Capacitor/RN)
class MobileTokenStorage implements TokenStorage {
  async getAccessToken() {
    // TODO Story 4: Use Capacitor SecureStoragePlugin or React Native Keychain
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      // const { SecureStoragePlugin } = Capacitor.Plugins;
      // return await SecureStoragePlugin.get({ key: 'accessToken' });
    }
    return null;
  }

  async setAccessToken(token: string) {
    // TODO Story 4
  }

  async getRefreshToken() {
    // TODO Story 4
    return null;
  }

  async setRefreshToken(token: string) {
    // TODO Story 4
  }

  async clearTokens() {
    // TODO Story 4
  }
}

// Factory
export function createTokenStorage(): TokenStorage {
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

  if (isCapacitor || isReactNative) {
    return new MobileTokenStorage();
  }

  return new WebTokenStorage();
}

export const tokenStorage = createTokenStorage();
```

**Security note:** Do NOT use `localStorage` for tokens (vulnerable to XSS). Use:
- Web: in-memory or `sessionStorage` (cleared on tab close)
- Mobile: OS-native secure storage (Keychain, Keystore)

---

### 2. Create Auth Context

**File:** `dating-ui/src/contexts/auth-context.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { tokenStorage } from '@/lib/token-storage';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-refresh timeout
  const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout | null>(null);

  // Initialize: check if user already logged in (tokens in storage)
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = await tokenStorage.getAccessToken();
      if (accessToken) {
        try {
          const decoded = jwtDecode<{ userId: string; email: string }>(accessToken);
          // Fetch full user profile from API
          const res = await fetch('/api/me/profile', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            scheduleTokenRefresh(accessToken);
          } else {
            // Token invalid, clear
            await tokenStorage.clearTokens();
          }
        } catch {
          await tokenStorage.clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const scheduleTokenRefresh = (accessToken: string) => {
    try {
      const decoded = jwtDecode<{ exp: number }>(accessToken);
      const expiresAt = decoded.exp * 1000; // Convert to ms
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Refresh 1 minute before expiry
      const refreshIn = Math.max(timeUntilExpiry - 60 * 1000, 0);

      if (refreshTimeout) clearTimeout(refreshTimeout);

      const timeout = setTimeout(async () => {
        await refreshAccessToken();
      }, refreshIn);

      setRefreshTimeout(timeout);
    } catch (err) {
      console.error('Failed to decode token for refresh scheduling:', err);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) {
        throw new Error('Refresh failed');
      }

      const { accessToken } = await res.json();
      await tokenStorage.setAccessToken(accessToken);
      scheduleTokenRefresh(accessToken);
    } catch (err) {
      console.error('Token refresh failed, logging out:', err);
      await logout();
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Login failed');
    }

    const { accessToken, refreshToken, user: userData } = await res.json();

    await tokenStorage.setAccessToken(accessToken);
    await tokenStorage.setRefreshToken(refreshToken);
    setUser(userData);
    scheduleTokenRefresh(accessToken);
  };

  const logout = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();

    // Call backend logout (revoke refresh token)
    try {
      const accessToken = await tokenStorage.getAccessToken();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ refreshToken })
      });
    } catch (err) {
      // Logout locally even if backend call fails
      console.error('Backend logout failed:', err);
    }

    // Clear local state
    await tokenStorage.clearTokens();
    setUser(null);
    if (refreshTimeout) clearTimeout(refreshTimeout);
  };

  const getAccessToken = async (): Promise<string | null> => {
    return await tokenStorage.getAccessToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        getAccessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

### 3. Wrap App in AuthProvider

**File:** `dating-ui/src/app/layout.tsx`

```typescript
import { AuthProvider } from '@/contexts/auth-context';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

### 4. Update Login Page

**File:** `dating-ui/src/app/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      router.push('/dating/me-matches');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Log In</button>
    </form>
  );
}
```

---

### 5. Add Route Protection

**File:** `dating-ui/src/app/dating/layout.tsx`

```typescript
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DatingLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect happening
  }

  return <>{children}</>;
}
```

---

## Testing

### Manual Testing

**1. Login flow:**
- Go to `/login`
- Enter email + password
- Click "Log In"
- Verify redirected to `/dating/me-matches`
- Check `sessionStorage` for `accessToken` and `refreshToken`

**2. Token persistence:**
- Reload page
- Verify still logged in (user state restored)

**3. Auto-refresh:**
- Wait ~14 minutes (before 15-min token expires)
- Verify new token fetched (check Network tab for `/api/auth/refresh`)
- Verify still logged in

**4. Logout:**
- Click logout button
- Verify redirected to `/login`
- Verify tokens cleared from `sessionStorage`

**5. Protected routes:**
- Try to access `/dating/me-matches` without logging in
- Verify redirected to `/login`

---

### Automated Tests

**File:** `dating-ui/src/contexts/auth-context.test.tsx`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-context';

describe('useAuth', () => {
  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('logs in and stores tokens', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: 'test-access',
            refreshToken: 'test-refresh',
            user: { id: '123', email: 'test@example.com', name: 'Test User' }
          })
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
  });

  it('logs out and clears tokens', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    // Assume logged in
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

---

## Race Condition Handling

**Problem:** Multiple concurrent API requests might all try to refresh the token at the same time.

**Solution (Story 3):** The API client (next story) will queue requests during refresh to prevent duplicates.

---

## Files Changed

- ✅ `dating-ui/src/lib/token-storage.ts` (new)
- ✅ `dating-ui/src/contexts/auth-context.tsx` (new)
- ✅ `dating-ui/src/hooks/use-auth.ts` (optional re-export)
- ✅ `dating-ui/src/app/layout.tsx` (wrap with AuthProvider)
- ✅ `dating-ui/src/app/login/page.tsx` (use useAuth)
- ✅ `dating-ui/src/app/dating/layout.tsx` (protect routes)
- ✅ `dating-ui/src/contexts/auth-context.test.tsx` (new tests)

---

## Success Criteria

- [x] `AuthProvider` wraps app (via existing `providers.tsx`)
- [x] `useAuth()` hook works (+ `getAccessToken()` for Story 3)
- [x] Login flow stores tokens and sets user state (Google GIS → wrapped login response)
- [x] Logout flow clears tokens and user state
- [x] Page reload preserves auth state (web: sessionStorage + cookie bootstrap)
- [x] Auto-refresh triggers before token expires (`auth-token-scheduler`)
- [x] Protected routes redirect unauthenticated users (existing `AuthenticatedAppShell`)
- [x] All tests pass (24 story unit tests)
