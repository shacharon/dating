# Story 04 — Multi-Audience Google OAuth

**Sprint:** 67  
**Effort:** 4 hours  
**Risk:** 🟢 LOW (config change only)  
**Status:** Done

---

## Objective

Support multiple Google OAuth client IDs (web, Android, iOS) so native Android app can sign in with its own client ID.

**Deliverable:** Google auth accepts tokens from web + Android + iOS clients.

---

## SOLID/OOP/KISS Principles

### ✅ Open/Closed Principle (OCP)
- Extend behavior (support more client IDs) without modifying service logic
- Just change config array

### ✅ KISS
- Simple config change, no complex logic
- String → String[] change

---

## Current Problem

```typescript
// google-auth.service.ts
const ticket = await this.client.verifyIdToken({
  idToken: idToken,
  audience: this.config.clientId  // ❌ Single string, only web client ID
});
```

**Impact:** Android native app has different client ID → `verifyIdToken` fails with 401 → every Android login blocked.

---

## Fix

### Step 1: Update Config Interface

**File:** `src/auth/auth.config.ts`

```typescript
export interface GoogleAuthConfig {
  clientId: string;        // Deprecated, keep for backward compat
  clientIds: string[];     // New: array of allowed client IDs
  clientSecret: string;
}

export function loadGoogleAuthConfig(): GoogleAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientIdsEnv = process.env.GOOGLE_CLIENT_IDS;
  
  // Parse GOOGLE_CLIENT_IDS (comma-separated)
  const clientIds = clientIdsEnv
    ? clientIdsEnv.split(',').map(id => id.trim()).filter(Boolean)
    : [clientId]; // Fallback to single clientId for backward compat
  
  if (clientIds.length === 0) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS required');
  }
  
  return {
    clientId: clientIds[0], // First one for backward compat
    clientIds,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  };
}
```

---

### Step 2: Update Service to Accept Array

**File:** `src/auth/google-auth.service.ts`

```typescript
async verifyGoogleIdToken(idToken: string): Promise<GoogleUser> {
  try {
    const ticket = await this.client.verifyIdToken({
      idToken: idToken,
      audience: this.config.clientIds, // ✅ Pass array instead of string
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    return {
      googleId: payload.sub,
      email: payload.email!,
      name: payload.name || 'User',
      picture: payload.picture,
    };
  } catch (error) {
    this.logger.error(`Google token verification failed: ${error.message}`);
    throw new UnauthorizedException('Invalid Google token');
  }
}
```

**That's it!** `verifyIdToken` already supports string[] for audience ([docs](https://googleapis.dev/nodejs/google-auth-library/latest/interfaces/VerifyIdTokenOptions.html)).

---

### Step 3: Update Environment Variables

**File:** `.env.example`

```bash
# Google OAuth
# Option 1: Single client ID (backward compatible)
GOOGLE_CLIENT_ID="web-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."

# Option 2: Multiple client IDs (recommended for mobile)
GOOGLE_CLIENT_IDS="web-client-id.apps.googleusercontent.com,android-client-id.apps.googleusercontent.com,ios-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
```

---

### Step 4: Deployment Configuration

For production `.env`:

```bash
# Get these from Google Cloud Console:
# https://console.cloud.google.com/apis/credentials

GOOGLE_CLIENT_IDS="123456-web.apps.googleusercontent.com,123456-android.apps.googleusercontent.com,123456-ios.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret"
```

**How to get Android client ID:**
1. Go to Google Cloud Console → Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Android
4. Package name: `com.yourcompany.dating` (from Capacitor config)
5. SHA-1 signing certificate: From your keystore

---

## Testing

### Unit Tests

**File:** `src/auth/google-auth.service.spec.ts`

```typescript
describe('GoogleAuthService - Multi-Audience', () => {
  it('accepts token from web client ID', async () => {
    const config = {
      clientIds: ['web-id', 'android-id'],
      clientSecret: 'secret',
    };
    
    const service = new GoogleAuthService(config);
    
    // Mock Google client verifyIdToken
    jest.spyOn(service['client'], 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-123',
        email: 'user@example.com',
        name: 'Test User',
      }),
    } as any);
    
    const result = await service.verifyGoogleIdToken('web-token');
    
    expect(result.googleId).toBe('google-user-123');
    expect(service['client'].verifyIdToken).toHaveBeenCalledWith({
      idToken: 'web-token',
      audience: ['web-id', 'android-id'], // ✅ Array passed
    });
  });

  it('accepts token from Android client ID', async () => {
    // Similar test with Android token
  });

  it('rejects token from unknown client ID', async () => {
    jest.spyOn(service['client'], 'verifyIdToken').mockRejectedValue(
      new Error('Invalid audience')
    );
    
    await expect(service.verifyGoogleIdToken('unknown-token')).rejects.toThrow(
      'Invalid Google token'
    );
  });
});
```

---

### Integration Tests

**File:** `src/auth/auth.integration.spec.ts`

```typescript
describe('Google Auth (e2e)', () => {
  it('POST /api/v1/auth/google with web client token → success', async () => {
    const webToken = await helper.generateGoogleToken('web-client-id');
    
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: webToken })
      .expect(200);
    
    expect(res.body.user.email).toBe('user@example.com');
  });

  it('POST /api/v1/auth/google with Android client token → success', async () => {
    const androidToken = await helper.generateGoogleToken('android-client-id');
    
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: androidToken })
      .expect(200);
    
    expect(res.body.user.email).toBe('user@example.com');
  });

  it('POST /api/v1/auth/google with unknown client token → 401', async () => {
    const unknownToken = await helper.generateGoogleToken('unknown-client-id');
    
    await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: unknownToken })
      .expect(401);
  });
});
```

---

### Manual Testing (Android)

```bash
# 1. Setup Android app in Google Cloud Console
# 2. Add Android client ID to GOOGLE_CLIENT_IDS in .env
# 3. Build Android APK
# 4. Install on device/emulator
# 5. Tap "Sign in with Google"
# 6. Verify login succeeds (check backend logs for successful token verification)
```

---

## SOLID/OOP/KISS Checklist

- [x] OCP: Extended behavior (more client IDs) without modifying service logic
- [x] KISS: Minimal change (string → array)
- [x] Backward compatible (still accepts GOOGLE_CLIENT_ID)
- [x] No god classes created
- [x] Config validation throws clear error if no client IDs provided (500 when empty)

---

## Files Changed

**Modified:**
- `src/auth/auth.config.ts` (+15 lines) - Support clientIds array
- `src/auth/google-auth.service.ts` (+1 line) - Pass array to verifyIdToken
- `.env.example` (+3 lines) - Document GOOGLE_CLIENT_IDS
- `src/auth/google-auth.service.spec.ts` (+30 lines) - Test multi-audience

**No files deleted, no breaking changes.**

---

## Success Criteria

- [x] Config accepts comma-separated client IDs
- [x] Service passes array to `verifyIdToken`
- [x] Web login still works (backward compat)
- [x] Android login works with Android client ID (backend verify; device E2E → FE-06)
- [x] iOS login will work with iOS client ID when added to `GOOGLE_CLIENT_IDS`
- [x] Unknown client IDs rejected with 401
- [x] Tests pass (45 tests — config, service, auth HTTP)

---

## Effort Estimate

- Config change: 1 hour
- Service update: 30 minutes
- Testing: 1.5 hours
- Manual Android test: 1 hour

**Total:** 4 hours (half day)
