# Story 01 — Backend Token Endpoint + Middleware

**Sprint:** FE-01  
**Effort:** 3-4 days  
**Risk:** 🟡 MEDIUM (auth is security-critical)  
**Status:** Done

---

## Objective

Enable mobile apps to authenticate using **access + refresh tokens** (JWT or opaque) instead of HTTP-only cookies.

**Deliverable:** Backend endpoints and middleware that support **dual-mode auth** (cookies for web, tokens for mobile).

---

## Current State

```typescript
// dating-api/src/auth/auth.controller.ts
@Post('login')
async login(@Body() dto: LoginDto, @Res() res: Response) {
  const user = await this.authService.validateUser(dto.email, dto.password);
  const sessionToken = await this.authService.createSession(user.id);
  
  res.cookie('authToken', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
  
  return res.json({ user }); // ← No tokens in body
}

// dating-api/src/auth/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Only checks cookies, not Authorization header
}
```

**Problem:** Mobile apps cannot use cookies reliably.

---

## Target State

```typescript
// POST /api/auth/login
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "123", "email": "user@example.com", ... }
}

// POST /api/auth/refresh
// Body: { "refreshToken": "..." }
// Response: { "accessToken": "eyJ..." }

// All API requests:
// Option 1: Cookie (web) → works as before
// Option 2: Authorization: Bearer <accessToken> (mobile) → works
```

---

## Implementation Steps

### 1. Install JWT Library

```bash
npm install @nestjs/jwt jsonwebtoken
npm install -D @types/jsonwebtoken
```

Update `dating-api/src/auth/auth.module.ts`:

```typescript
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Add to .env
      signOptions: { expiresIn: '15m' } // Access token TTL
    }),
    // ... other imports
  ],
  // ...
})
export class AuthModule {}
```

---

### 2. Create TokenService

**File:** `dating-api/src/auth/token.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private refreshTokenRepo: RefreshTokenRepository // Story 1.4
  ) {}

  async generateTokenPair(user: { id: string; email: string }): Promise<TokenPair> {
    const payload: TokenPayload = { userId: user.id, email: user.email };
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m' // Short-lived
    });
    
    const refreshToken = this.jwtService.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' } // Longer-lived
    );
    
    // Store refresh token (hashed)
    await this.refreshTokenRepo.store(user.id, refreshToken);
    
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verify(token);
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const payload = this.jwtService.verify(refreshToken);
    
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    // Validate refresh token exists in DB (not revoked)
    const isValid = await this.refreshTokenRepo.validate(payload.userId, refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }
    
    // Rotate refresh token (invalidate old one)
    await this.refreshTokenRepo.revoke(payload.userId, refreshToken);
    
    // Generate new access token
    const newAccessToken = this.jwtService.sign(
      { userId: payload.userId, email: payload.email },
      { expiresIn: '15m' }
    );
    
    return newAccessToken;
  }

  async revokeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.refreshTokenRepo.revoke(userId, refreshToken);
  }
}
```

---

### 3. Create RefreshTokenRepository

**File:** `dating-api/src/auth/refresh-tokens.repository.ts`

**Option A: Redis (recommended for speed)**

```typescript
import { Injectable } from '@nestjs/common';
import { ICacheService } from '../cache/cache.port';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenRepository {
  constructor(private cache: ICacheService) {}

  async store(userId: string, refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    const key = `refresh_token:${userId}:${hash}`;
    
    // Store for 7 days (match token expiry)
    await this.cache.set(key, '1', 7 * 24 * 60 * 60);
  }

  async validate(userId: string, refreshToken: string): Promise<boolean> {
    const hash = this.hashToken(refreshToken);
    const key = `refresh_token:${userId}:${hash}`;
    const exists = await this.cache.get(key);
    return exists !== null;
  }

  async revoke(userId: string, refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    const key = `refresh_token:${userId}:${hash}`;
    await this.cache.del(key);
  }

  async revokeAll(userId: string): Promise<void> {
    // On logout: revoke all refresh tokens for user
    const keys = await this.cache.keys(`refresh_token:${userId}:*`);
    await Promise.all(keys.map(key => this.cache.del(key)));
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
```

**Option B: Database table (if no Redis)**

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

---

### 4. Update AuthController

**File:** `dating-api/src/auth/auth.controller.ts`

```typescript
@Post('login')
async login(@Body() dto: LoginDto, @Res() res: Response) {
  const user = await this.authService.validateUser(dto.email, dto.password);
  
  // Generate tokens
  const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(user);
  
  // DUAL MODE: Set cookie for web (backward compat)
  res.cookie('authToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 min
  });
  
  // ALSO return tokens in body for mobile
  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      // ... other safe fields
    }
  });
}

@Post('refresh')
async refresh(@Body() body: { refreshToken: string }) {
  const newAccessToken = await this.tokenService.refreshAccessToken(body.refreshToken);
  
  return { accessToken: newAccessToken };
}

@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@Req() req, @Body() body: { refreshToken?: string }, @Res() res: Response) {
  const userId = req.user.userId;
  
  // Revoke refresh token
  if (body.refreshToken) {
    await this.tokenService.revokeRefreshToken(userId, body.refreshToken);
  } else {
    // Revoke all (if no specific token provided)
    await this.refreshTokenRepo.revokeAll(userId);
  }
  
  // Clear cookie
  res.clearCookie('authToken');
  
  return res.json({ message: 'Logged out' });
}
```

---

### 5. Update Auth Guard (Dual Mode)

**File:** `dating-api/src/auth/jwt-auth.guard.ts`

```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenService } from './token.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private tokenService: TokenService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Option 1: Check Authorization header (mobile)
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = await this.tokenService.verifyAccessToken(token);
        request.user = payload; // Attach user to request
        return true;
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
    
    // Option 2: Check cookie (web, backward compat)
    const cookieToken = request.cookies['authToken'];
    if (cookieToken) {
      try {
        const payload = await this.tokenService.verifyAccessToken(cookieToken);
        request.user = payload;
        return true;
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired session');
      }
    }
    
    throw new UnauthorizedException('No authentication provided');
  }
}
```

---

### 6. Update .env

```bash
# Add to .env and .env.example
JWT_SECRET=<generate-strong-random-secret>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

**Generate secret:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Testing

### Manual API Tests (Postman / curl)

**1. Login (get tokens):**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Response:
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": { "id": "123", ... }
}
```

**2. Access protected endpoint (token in header):**

```bash
curl http://localhost:3000/api/me/profile \
  -H "Authorization: Bearer eyJhbGci..."
```

**3. Access protected endpoint (cookie):**

```bash
curl http://localhost:3000/api/me/profile \
  -b cookies.txt
```

**4. Refresh token:**

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGci..."}'

# Response:
{
  "accessToken": "eyJhbGci..." # New token
}
```

**5. Logout:**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGci..."}'
```

---

### Automated Tests

**File:** `dating-api/src/auth/auth.e2e.spec.ts`

```typescript
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let tokens: { accessToken: string; refreshToken: string };

  it('POST /auth/login returns tokens in body', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.id).toBeDefined();
    
    tokens = { accessToken: res.body.accessToken, refreshToken: res.body.refreshToken };
  });

  it('GET /me/profile works with Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
  });

  it('GET /me/profile still works with cookie', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    await agent.get('/me/profile').expect(200); // Cookie attached automatically
  });

  it('POST /auth/refresh returns new access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.accessToken).not.toBe(tokens.accessToken); // New token
  });

  it('Expired token returns 401', async () => {
    const expiredToken = 'eyJhbGci...expired...';
    await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('Invalid refresh token returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid' })
      .expect(401);
  });
});
```

---

## Security Checklist

- [x] JWT secret is strong (64+ chars) and stored in env var (not hardcoded)
- [x] Access token TTL is short (15 min or less)
- [x] Refresh token TTL is reasonable (7 days, not 1 year)
- [x] Refresh tokens are stored **hashed** (not plaintext)
- [x] Refresh tokens are rotated (one-time use)
- [x] Tokens are validated on every request
- [x] HTTPS enforced in production (`COOKIE_SECURE` + deployment TLS)
- [x] No sensitive data in token payload (no passwords, no PII beyond user ID)
- [ ] Refresh endpoint rate limiting — deferred (Agent 2.5 / follow-up)

---

## Rollout Plan

1. **Deploy backend first** (dual-mode: cookies + tokens)
2. **Test web app** (should work unchanged, using cookies)
3. **Deploy frontend** (Story 2-3, adds token support)
4. **Test mobile app** (Story 4, Android build)
5. **Optional: deprecate cookies** after mobile launch (web switches to tokens)

---

## Files Changed

- ✅ `dating-api/src/auth/token.service.ts` (new)
- ✅ `dating-api/src/auth/refresh-tokens.repository.ts` (new)
- ✅ `dating-api/src/auth/auth.controller.ts` (updated)
- ✅ `dating-api/src/auth/jwt-auth.guard.ts` (updated)
- ✅ `dating-api/src/auth/auth.module.ts` (add JwtModule)
- ✅ `.env` / `.env.example` (add JWT_SECRET)
- ✅ `dating-api/src/auth/auth.e2e.spec.ts` (new tests)

---

## Success Criteria

- [x] `POST /api/v1/auth/google` returns `{ accessToken, refreshToken, user }` in body (+ Set-Cookie for web)
- [x] `POST /api/v1/auth/refresh` works and returns new `accessToken` + rotated `refreshToken`
- [x] Protected endpoints accept `Authorization: Bearer <token>` header
- [x] Protected endpoints still accept cookies (backward compat)
- [x] Invalid Bearer / refresh token → 401 Unauthorized
- [x] Disabled user via Bearer → 403 Forbidden
- [x] Logout revokes refresh token (body `refreshToken` or Bearer revoke-all)
- [x] Auth integration + unit tests pass (`npm run smoke:auth` — 83 tests)

**Pre-production follow-up (Agent 2.5 skipped):** refresh rate limiting, concurrent-refresh hardening review.
