# Story 03 — API Client Integration (Axios + Token)

**Sprint:** FE-01  
**Effort:** 2 days  
**Risk:** 🟢 LOW  
**Status:** ✅ **Done** (2026-08-22) — uncommitted on working tree (dating-ui)  
**Depends on:** Story 02 (auth context with tokens)

---

## Objective

Create a **centralized API client** that automatically attaches the access token to all requests and handles token refresh on 401 errors.

**Deliverable:** Replace scattered `fetch` calls with a single `apiClient` that manages auth headers and refresh logic.

---

## Current State

**API calls are scattered and manual:**

```typescript
// dating-ui/src/lib/me-matches-api.ts
export async function getMatches() {
  const res = await fetch('/api/me/matches', {
    credentials: 'include' // Cookie-based
  });
  return res.json();
}

// dating-ui/src/lib/conversations-api.ts
export async function getConversations() {
  const res = await fetch('/api/conversations', {
    credentials: 'include'
  });
  return res.json();
}
```

**Problems:**
- No automatic token attachment
- No 401 handling (refresh + retry)
- Duplicate error handling everywhere
- Hard to switch between cookie and token auth

---

## Target State

```typescript
// dating-ui/src/lib/me-matches-api.ts
import { apiClient } from './api-client';

export async function getMatches() {
  const res = await apiClient.get('/api/me/matches');
  return res.data;
}

// dating-ui/src/lib/conversations-api.ts
import { apiClient } from './api-client';

export async function getConversations() {
  const res = await apiClient.get('/api/conversations');
  return res.data;
}
```

**apiClient handles:**
- ✅ Automatic `Authorization: Bearer <token>` header
- ✅ 401 → refresh token → retry request
- ✅ Refresh failure → logout + redirect to login
- ✅ Concurrent requests during refresh (queued)

---

## Implementation Steps

### 1. Install Axios (optional, or use fetch wrapper)

**Option A: Axios (recommended)**

```bash
npm install axios
```

**Option B: Fetch wrapper (no dependencies)**

Use a lightweight fetch wrapper (see below).

---

### 2. Create API Client with Axios

**File:** `dating-ui/src/lib/api-client.ts`

```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './token-storage';

// Track if a refresh is in progress
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '', // Optional: for mobile (e.g., 'https://api.example.com')
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach access token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = await tokenStorage.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (refresh token)
apiClient.interceptors.response.use(
  (response) => response, // Success: pass through
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh is already in progress, wait for it
      if (isRefreshing && refreshPromise) {
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }

      // Start refresh
      isRefreshing = true;
      refreshPromise = refreshAccessToken();

      try {
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest); // Retry original request
      } catch (refreshError) {
        // Refresh failed: logout user
        await handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  }
);

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) {
    throw new Error('Token refresh failed');
  }

  const { accessToken } = await res.json();
  await tokenStorage.setAccessToken(accessToken);
  return accessToken;
}

async function handleLogout() {
  await tokenStorage.clearTokens();
  
  // Redirect to login (works for web; mobile needs native navigation)
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export { apiClient };
```

---

### 3. Alternative: Fetch Wrapper (No Dependencies)

**File:** `dating-ui/src/lib/api-client.ts` (fetch version)

```typescript
import { tokenStorage } from './token-storage';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

interface ApiClientOptions extends RequestInit {
  url: string;
}

async function apiClient<T = any>(options: ApiClientOptions): Promise<T> {
  const { url, ...fetchOptions } = options;

  // Attach access token
  const accessToken = await tokenStorage.getAccessToken();
  const headers = new Headers(fetchOptions.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let res = await fetch(url, {
    ...fetchOptions,
    headers
  });

  // Handle 401: refresh and retry
  if (res.status === 401) {
    // Wait for refresh if already in progress
    if (isRefreshing && refreshPromise) {
      const newAccessToken = await refreshPromise;
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      res = await fetch(url, { ...fetchOptions, headers });
    } else {
      // Start refresh
      isRefreshing = true;
      refreshPromise = refreshAccessToken();

      try {
        const newAccessToken = await refreshPromise;
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        res = await fetch(url, { ...fetchOptions, headers }); // Retry
      } catch (err) {
        await handleLogout();
        throw err;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Helper methods
apiClient.get = <T = any>(url: string, options?: RequestInit): Promise<T> =>
  apiClient<T>({ url, method: 'GET', ...options });

apiClient.post = <T = any>(url: string, body?: any, options?: RequestInit): Promise<T> =>
  apiClient<T>({ url, method: 'POST', body: JSON.stringify(body), ...options });

apiClient.put = <T = any>(url: string, body?: any, options?: RequestInit): Promise<T> =>
  apiClient<T>({ url, method: 'PUT', body: JSON.stringify(body), ...options });

apiClient.delete = <T = any>(url: string, options?: RequestInit): Promise<T> =>
  apiClient<T>({ url, method: 'DELETE', ...options });

async function refreshAccessToken(): Promise<string> {
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
    throw new Error('Token refresh failed');
  }

  const { accessToken } = await res.json();
  await tokenStorage.setAccessToken(accessToken);
  return accessToken;
}

async function handleLogout() {
  await tokenStorage.clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export { apiClient };
```

---

### 4. Update API Modules

**File:** `dating-ui/src/lib/me-matches-api.ts`

```typescript
import { apiClient } from './api-client';

export async function getMatches() {
  return apiClient.get('/api/me/matches');
}

export async function likeMatch(matchId: string) {
  return apiClient.post(`/api/me/matches/${matchId}/like`);
}

export async function passMatch(matchId: string) {
  return apiClient.post(`/api/me/matches/${matchId}/pass`);
}
```

**File:** `dating-ui/src/lib/conversations-api.ts`

```typescript
import { apiClient } from './api-client';

export async function getConversations() {
  return apiClient.get('/api/conversations');
}

export async function getMessages(conversationId: string) {
  return apiClient.get(`/api/conversations/${conversationId}/messages`);
}

export async function sendMessage(conversationId: string, text: string) {
  return apiClient.post(`/api/conversations/${conversationId}/messages`, { text });
}
```

**File:** `dating-ui/src/lib/me-profile-api.ts`

```typescript
import { apiClient } from './api-client';

export async function getProfile() {
  return apiClient.get('/api/me/profile');
}

export async function updateProfile(data: any) {
  return apiClient.put('/api/me/profile', data);
}
```

---

### 5. Update Components to Use API Client

**Example:** `dating-ui/src/app/dating/me-matches/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getMatches } from '@/lib/me-matches-api';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await getMatches(); // ← Uses apiClient with auto-token
        setMatches(data);
      } catch (err) {
        console.error('Failed to fetch matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {matches.map((match) => (
        <div key={match.id}>{match.name}</div>
      ))}
    </div>
  );
}
```

---

## Testing

### Manual Testing

**1. Login and make API request:**
- Log in
- Go to `/dating/me-matches`
- Open DevTools → Network tab
- Verify `GET /api/me/matches` has `Authorization: Bearer <token>` header

**2. Token expiry and refresh:**
- Let access token expire (wait 15 min, or manually set a 1-min TTL in dev)
- Make another API request
- Verify:
  - First request → 401
  - `POST /api/auth/refresh` called
  - Original request retried with new token → 200

**3. Concurrent requests during refresh:**
- Make multiple API requests at the same time when token is expired
- Verify only 1 refresh call (other requests wait)

**4. Refresh failure (logout):**
- Delete refresh token from storage
- Make API request
- Verify:
  - 401 → refresh fails → redirect to `/login`

---

### Automated Tests

**File:** `dating-ui/src/lib/api-client.test.ts`

```typescript
import { apiClient } from './api-client';
import { tokenStorage } from './token-storage';

jest.mock('./token-storage');

describe('apiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches access token to request', async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue('test-token');

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'success' })
      })
    );

    await apiClient.get('/api/test');

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token'
        })
      })
    );
  });

  it('refreshes token on 401 and retries request', async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue('expired-token');
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue('refresh-token');

    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        // First call: 401
        return Promise.resolve({ ok: false, status: 401 });
      } else if (callCount === 2) {
        // Refresh call
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'new-token' })
        });
      } else {
        // Retry call: success
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success' })
        });
      }
    });

    const result = await apiClient.get('/api/test');

    expect(fetch).toHaveBeenCalledTimes(3); // Original + refresh + retry
    expect(tokenStorage.setAccessToken).toHaveBeenCalledWith('new-token');
    expect(result.data).toBe('success');
  });

  it('logs out on refresh failure', async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue('expired-token');
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue('invalid-refresh');

    delete window.location;
    window.location = { href: '' } as any;

    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 401 })
    );

    await expect(apiClient.get('/api/test')).rejects.toThrow();

    expect(tokenStorage.clearTokens).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });
});
```

---

## Files Changed

- ✅ `dating-ui/src/lib/api-client.ts` (new)
- ✅ `dating-ui/src/lib/me-matches-api.ts` (use apiClient)
- ✅ `dating-ui/src/lib/conversations-api.ts` (use apiClient)
- ✅ `dating-ui/src/lib/me-profile-api.ts` (use apiClient)
- ✅ `dating-ui/src/app/dating/me-matches/page.tsx` (use new API)
- ✅ `dating-ui/src/app/dating/conversations/[id]/page.tsx` (use new API)
- ✅ `dating-ui/src/lib/api-client.test.ts` (new tests)

---

## Success Criteria

- [x] `authenticatedFetch` / `api-client` attaches `Authorization: Bearer <token>` when token exists
- [x] 401 errors trigger token refresh + retry (single retry)
- [x] Concurrent requests during refresh deduped (coordinator mutex — one refresh call)
- [x] Refresh failure logs user out via registered handler → `/` (architect D12; not `/login`)
- [x] All in-scope authenticated lib API modules use centralized client (13 migrated; exclusions per architect)
- [x] Tests pass (47 story-targeted vitest)

---

## Next: Story 4

Story 4 will add platform detection and mobile-specific token storage (Capacitor or React Native).
