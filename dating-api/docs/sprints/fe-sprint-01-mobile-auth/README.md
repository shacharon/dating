# FE Sprint 01 — Mobile Auth Foundation (Token-Based)

**Status:** ✅ **Done** (2026-08-22) — all 4 stories code-complete; manual/E2E smoke partial  
**Priority:** 🔴 **P0** — Foundation for mobile auth (code complete; Android shell + FE-03 socket auth remain for launch)  
**Depends on:** None (independent)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-ui` (frontend)  
**Target:** Android app launch readiness

---

## Problem

**Current state:** Web app uses **HTTP-only cookies** for authentication.

```typescript
// login-page.tsx
await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include', // ← Cookie-based
  body: JSON.stringify({ email, password })
});

// Set-Cookie: authToken=...; HttpOnly; Secure
```

**Why it blocks Android:**
- Mobile apps (Capacitor, React Native) **cannot reliably use HTTP-only cookies**
- Cross-origin requests from native apps fail
- No standard cookie jar in native WebView/networking
- Cannot attach cookies to WebSocket connections from native code

---

## Goal

Implement **token-based authentication** (JWT or opaque tokens) that works for:
- ✅ Web app (backward compatible, migrate gradually)
- ✅ Android app (primary driver)
- ✅ iOS app (future)

**Pattern:** Industry-standard mobile auth flow (auth0, Firebase, Supabase, etc.)

---

## Success Criteria

### Backend (`dating-api`)

- [x] **POST /api/v1/auth/google** returns `{ accessToken, refreshToken, user }` in response body (not just Set-Cookie)
- [x] **POST /api/v1/auth/refresh** accepts `refreshToken`, returns new tokens (rotation)
- [x] **Middleware** accepts `Authorization: Bearer <token>` header (in addition to cookies for web)
- [x] **Token validation** works (signature, expiration, user ID extraction)
- [x] **Refresh token rotation** implemented (security best practice)

### Frontend (`dating-ui`)

- [x] **Auth context** stores tokens in memory + sessionStorage (web); Capacitor Preferences (mobile)
- [x] **API client** attaches `Authorization: Bearer <token>` to authenticated requests — Story 3 ✅
- [x] **Auto-refresh** logic triggers before token expires
- [x] **Login/logout** updates token state
- [x] **Backward compat** web flow still works (cookies + tokens dual mode)

### Testing

- [ ] Web app login/logout works (Chrome, Safari) — manual smoke deferred
- [ ] Token refresh works (let token expire, verify auto-refresh) — manual smoke deferred
- [x] Android mock test (Capacitor Preferences unit tests) — emulator deferred Phase B
- [ ] Unauthorized → redirect to login
- [x] Concurrent requests during refresh don't duplicate refresh calls — Story 3 (coordinator mutex)

---

## Stories

### Story 1 — Backend Token Endpoint + Middleware
**Effort:** 3-4 days  
**Risk:** 🟡 MEDIUM (auth is critical; needs security review)  
**Status:** ✅ **Done** (2026-08-22) — branch `feature/fe-sprint-01-story-1`

**Tasks:**
1. Add JWT library (`@nestjs/jwt` or `jsonwebtoken`)
2. Create `TokenService` (generate access + refresh tokens)
3. Update `POST /api/auth/login` to return `{ accessToken, refreshToken, user }` in body
4. Create `POST /api/auth/refresh` endpoint
5. Update auth guard to accept **both** cookies (web) and `Authorization` header (mobile)
6. Add refresh token storage (Redis or DB table: `user_id, refresh_token_hash, expires_at`)
7. Implement refresh token rotation (invalidate old token on refresh)

**Security checklist:**
- Access token: short TTL (15 min)
- Refresh token: longer TTL (7 days), stored hashed
- Refresh token rotation (one-time use)
- HTTPS only in production

**Files:**
- `dating-api/src/auth/token.service.ts` (new)
- `dating-api/src/auth/auth.service.ts` (update login method)
- `dating-api/src/auth/auth.controller.ts` (add `/refresh` endpoint)
- `dating-api/src/auth/jwt-auth.guard.ts` (update to check header or cookie)
- `dating-api/src/auth/refresh-tokens.repository.ts` (new, store refresh tokens)

---

### Story 2 — Frontend Auth Context + Token Storage
**Effort:** 2-3 days  
**Risk:** 🟡 MEDIUM (need to handle race conditions on refresh)  
**Status:** ✅ **Done** (2026-08-22) — uncommitted on `feature/fe-sprint-01-story-1` (dating-ui changes)

**Tasks:**
1. Create `AuthContext` (stores `accessToken`, `refreshToken`, `user` in state)
2. Token storage:
   - **Web:** `sessionStorage` or memory (no `localStorage` for security)
   - **Mobile:** Secure storage (Capacitor `SecureStoragePlugin` or React Native `Keychain`)
3. Implement `useAuth()` hook:
   - `login(email, password)` → fetch tokens → store
   - `logout()` → clear tokens
   - `refreshAccessToken()` → call `/auth/refresh`
4. Auto-refresh logic:
   - Decode token expiration (`jwt-decode`)
   - Set timeout to refresh 1 min before expiry
   - Clear timeout on logout
5. Wrap app in `<AuthProvider>`

**Files:**
- `dating-ui/src/contexts/auth-context.tsx` (new)
- `dating-ui/src/hooks/use-auth.ts` (new)
- `dating-ui/src/lib/token-storage.ts` (new, platform-aware)
- `dating-ui/src/app/layout.tsx` (wrap with AuthProvider)

---

### Story 3 — API Client Integration (Axios/Fetch + Token)
**Effort:** 2 days  
**Risk:** 🟢 LOW  
**Status:** ✅ **Done** (2026-08-22) — uncommitted on working tree (dating-ui)

**Delivered:** `authenticatedFetch()` (fetch-native, no axios), `auth-refresh-coordinator`, `auth-session-revocation`, 13 lib `*-api.ts` modules migrated. See [STORY_03_api_client_integration.md](./STORY_03_api_client_integration.md).

**Tasks:**
1. Create centralized `apiClient.ts` (Axios or fetch wrapper)
2. Add request interceptor: attach `Authorization: Bearer ${accessToken}`
3. Add response interceptor:
   - On `401 Unauthorized` → refresh token → retry request
   - On refresh failure → logout + redirect to login
4. Update all API calls to use `apiClient` instead of raw `fetch`
5. Handle concurrent requests during refresh (queue requests, resolve after refresh)

**Files:**
- `dating-ui/src/lib/api-client.ts` (new)
- `dating-ui/src/lib/me-matches-api.ts` (update to use apiClient)
- `dating-ui/src/lib/me-profile-api.ts` (update to use apiClient)
- `dating-ui/src/lib/conversations-api.ts` (update to use apiClient)

**Pattern:**
```typescript
// Before
const res = await fetch('/api/me/profile', { credentials: 'include' });

// After
const res = await apiClient.get('/api/me/profile');
// ↑ Automatically adds Authorization header
```

---

### Story 4 — Platform Detection + Mobile Stub
**Effort:** 1-2 days  
**Risk:** 🟢 LOW  
**Status:** ✅ **Done** (2026-08-22) — Phase A; uncommitted on working tree (dating-ui)

**Delivered:** `platform.ts`, `CapacitorTokenStorage` (Preferences), `ReactNativeTokenStorage` stub, `@capacitor/core` + `@capacitor/preferences`. Phase B (Android shell) deferred. See [STORY_04_platform_mobile_stub.md](./STORY_04_platform_mobile_stub.md).

**Tasks:**
1. Create `platform.ts` utility (detect web vs Capacitor vs React Native)
2. Mock mobile environment for local dev (stub `SecureStoragePlugin`)
3. Update `token-storage.ts` to use platform-specific storage
4. Add Android build config (Capacitor or React Native, based on Sprint FE-3 decision)
5. Test token flow in Android emulator

**Files:**
- `dating-ui/src/lib/platform.ts` (new)
- `dating-ui/src/lib/token-storage.ts` (platform branches)
- `dating-ui/capacitor.config.ts` or `android/` folder (based on FE-3)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking web app during migration | Dual-mode auth (cookies + tokens), deploy backend first, test web |
| Refresh token security | Hash tokens, rotate on use, short TTL, HTTPS only |
| Race condition on concurrent refresh | Queue requests during refresh, use mutex/semaphore |
| Mobile storage security | Use OS-native secure storage (Keychain, Keystore) |

---

## Dependencies

- **Before FE-2 (Unified Data Layer):** Yes, this sprint creates the `apiClient` foundation that FE-2 builds on
- **Before FE-3 (Android Shell):** Ideally yes (token storage needs to know platform), but can stub
- **Before FE-4 (Socket Auth):** Yes, socket auth will use the access token from this sprint

---

## Testing Checklist

**Backend:**
- [ ] `POST /api/auth/login` returns tokens in body
- [ ] `POST /api/auth/refresh` works
- [ ] Auth guard accepts `Authorization: Bearer <token>`
- [ ] Auth guard still accepts cookies (web backward compat)
- [ ] Expired token → 401
- [ ] Invalid token → 401
- [ ] Refresh with valid refresh token → new access token
- [ ] Refresh with expired/invalid refresh token → 401

**Frontend:**
- [ ] Login flow: tokens stored, user logged in
- [ ] Logout flow: tokens cleared, user logged out
- [ ] API request includes `Authorization` header
- [ ] Token expiry → auto-refresh → request succeeds
- [ ] Refresh failure → redirect to login
- [ ] Concurrent requests during refresh → all succeed after refresh
- [ ] Page reload → user still logged in (web: sessionStorage; mobile: secure storage)

**Android (mock/emulator):**
- [ ] Login from Android app → tokens stored in Keychain/Keystore
- [ ] API request from Android → token attached
- [ ] Token refresh from Android → works

---

## Launch Readiness

**Can launch Android without this?** ❌ **NO**  
This is the **foundation** for all mobile API requests.

**Can defer stories?**
- Story 1-3: ❌ Required
- Story 4: ⚠️ Can use web-only stub initially, but need for Android build

---

## References

**Industry examples:**
- [Auth0 Mobile Auth](https://auth0.com/docs/quickstart/native)
- [Firebase Auth (mobile)](https://firebase.google.com/docs/auth)
- [Supabase Auth (React Native)](https://supabase.com/docs/guides/auth/native-mobile-login)

**NestJS JWT:**
- [@nestjs/jwt docs](https://docs.nestjs.com/security/authentication#jwt-token)
- [Passport JWT strategy](https://www.passportjs.org/packages/passport-jwt/)

**React Native Secure Storage:**
- [Capacitor SecureStorage](https://capacitorjs.com/docs/apis/secure-storage)
- [React Native Keychain](https://github.com/oblador/react-native-keychain)
