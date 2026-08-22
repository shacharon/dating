# Story 03 — Production Infrastructure Validation

**Sprint:** 67  
**Effort:** 1 day  
**Risk:** 🟢 LOW (boot-time checks only)  
**Status:** Planned

---

## Objective

Add fail-fast validation at boot time for production infrastructure so misconfigured deployments never start "healthy" with broken functionality.

**Deliverable:** Production boots ONLY if all critical infrastructure is properly configured.

---

## SOLID/OOP/KISS Principles

### ✅ Fail-Fast Principle
- **KISS:** Simple boot checks, no complex retry/fallback
- **Why:** Better to crash at boot than silently fail in production

### ✅ Single Responsibility
- Each validation = one focused check
- Group related checks in same module (e.g., photo storage checks together)

---

## Checks to Add

### 1. Redis Adapter Must Succeed in Production

**Current Problem:**
```typescript
// redis-io.adapter.ts
try {
  await adapter.connectTo(url);
  setMessagingRedisAdapterBound(true);
} catch (error) {
  logger.warn('Redis failed, continuing single-instance'); // ❌ Silent failure
  setMessagingRedisAdapterBound(false);
}
```

**Fix:**
```typescript
// main.ts or redis-io.adapter.ts
if (process.env.NODE_ENV === 'production') {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL required in production for multi-instance support');
  }
  
  try {
    await adapter.connectTo(process.env.REDIS_URL);
    logger.log('Redis adapter connected successfully');
  } catch (error) {
    logger.error(`Redis adapter connection failed: ${error.message}`);
    throw error; // Fail boot, don't continue
  }
}
```

---

### 2. Photo Storage Must Be S3 in Production

**Current Problem:**
```typescript
// photo-storage.config.ts
const driver = process.env.PHOTO_STORAGE_DRIVER || 'local'; // ❌ Defaults to 'local'
```

**Fix:**
```typescript
// photo-storage.module.ts or config validation
if (process.env.NODE_ENV === 'production') {
  const driver = process.env.PHOTO_STORAGE_DRIVER;
  
  if (driver !== 's3') {
    throw new Error(
      'PHOTO_STORAGE_DRIVER must be "s3" in production. ' +
      'Local storage is ephemeral and will cause data loss.'
    );
  }
  
  if (!process.env.PHOTO_S3_BUCKET || !process.env.PHOTO_S3_REGION) {
    throw new Error('PHOTO_S3_BUCKET and PHOTO_S3_REGION required when driver=s3');
  }
  
  logger.log(`Photo storage: S3 (bucket=${process.env.PHOTO_S3_BUCKET})`);
}
```

---

### 3. Photo Moderation Must Be Rekognition in Production

**Current Problem:**
```typescript
// photo-storage.config.ts
const moderationDriver = process.env.PHOTO_MODERATION_DRIVER || 'mock'; // ❌ Defaults to mock
```

**Fix:**
```typescript
if (process.env.NODE_ENV === 'production') {
  const driver = process.env.PHOTO_MODERATION_DRIVER;
  
  if (driver === 'mock' || process.env.PHOTO_MODERATION_AUTO_APPROVE === '1') {
    throw new Error(
      'Photo moderation cannot use "mock" driver or auto-approve in production. ' +
      'This would allow NSFW content to bypass moderation.'
    );
  }
  
  if (driver !== 'rekognition') {
    throw new Error('PHOTO_MODERATION_DRIVER must be "rekognition" in production');
  }
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials required for Rekognition moderation');
  }
  
  logger.log('Photo moderation: AWS Rekognition');
}
```

---

### 4. Update Health Check (Readiness Probe)

**Current Problem:**
```typescript
// health.controller.ts
@Get()
check() {
  return { status: 'ok' }; // ❌ Shallow check
}
```

**Fix:**
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getMessagingRedisAdapterBound } from '../messaging-realtime/redis-io.adapter';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dbCheck = checks[0];
    const redisCheck = checks[1];

    const isHealthy = dbCheck.status === 'fulfilled' && redisCheck.status === 'fulfilled';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      checks: {
        database: dbCheck.status === 'fulfilled' ? 'ok' : 'failed',
        redis: redisCheck.status === 'fulfilled' ? 'ok' : 'failed',
      },
    };
  }

  private async checkDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`; // Simple ping
  }

  private async checkRedis(): Promise<void> {
    if (process.env.NODE_ENV === 'production' && !getMessagingRedisAdapterBound()) {
      throw new Error('Redis adapter not connected');
    }
  }
}

// health.controller.ts
@Get()
async check() {
  const result = await this.healthService.check();
  
  if (result.status !== 'ok') {
    throw new ServiceUnavailableException(result);
  }
  
  return result;
}
```

---

## Implementation

### File Structure

```
src/
├── main.ts                         # Boot validation (Redis, photo config)
├── health/
│   ├── health.service.ts           # Deep health checks
│   └── health.controller.ts        # GET /health endpoint
├── photo-storage/
│   └── photo-storage.module.ts     # Add validation on module init
└── messaging-realtime/
    └── redis-io.adapter.ts         # Fail boot if Redis unavailable
```

---

### Step 1: Create Validation Service

**File:** `src/config/production-validation.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductionValidationService implements OnModuleInit {
  private readonly logger = new Logger(ProductionValidationService.name);

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    if (this.config.get('NODE_ENV') === 'production') {
      this.logger.log('Running production configuration validation...');
      this.validateRedis();
      this.validatePhotoStorage();
      this.validatePhotoModeration();
      this.logger.log('✅ All production validations passed');
    }
  }

  private validateRedis() {
    const redisUrl = this.config.get('REDIS_URL');
    if (!redisUrl) {
      throw new Error(
        'REDIS_URL is required in production for multi-instance WebSocket support. ' +
        'Without Redis, messages will not be delivered across pods.'
      );
    }
  }

  private validatePhotoStorage() {
    const driver = this.config.get('PHOTO_STORAGE_DRIVER');
    
    if (driver !== 's3') {
      throw new Error(
        'PHOTO_STORAGE_DRIVER must be "s3" in production. ' +
        'Local storage is ephemeral and will cause data loss on pod restart/scale.'
      );
    }
    
    const bucket = this.config.get('PHOTO_S3_BUCKET');
    const region = this.config.get('PHOTO_S3_REGION');
    
    if (!bucket || !region) {
      throw new Error('PHOTO_S3_BUCKET and PHOTO_S3_REGION are required when using S3 storage');
    }
    
    this.logger.log(`Photo storage configured: S3 (${bucket} in ${region})`);
  }

  private validatePhotoModeration() {
    const driver = this.config.get('PHOTO_MODERATION_DRIVER');
    const autoApprove = this.config.get('PHOTO_MODERATION_AUTO_APPROVE');
    
    if (driver === 'mock' || autoApprove === '1') {
      throw new Error(
        'Photo moderation cannot use "mock" driver or auto-approve in production. ' +
        'This would allow NSFW/inappropriate content to bypass moderation, ' +
        'violating App Store policies and user safety.'
      );
    }
    
    if (driver !== 'rekognition') {
      throw new Error(
        'PHOTO_MODERATION_DRIVER must be "rekognition" in production'
      );
    }
    
    const awsKey = this.config.get('AWS_ACCESS_KEY_ID');
    const awsSecret = this.config.get('AWS_SECRET_ACCESS_KEY');
    
    if (!awsKey || !awsSecret) {
      throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required for Rekognition');
    }
    
    this.logger.log('Photo moderation configured: AWS Rekognition');
  }
}
```

---

### Step 2: Update Redis Adapter

**File:** `src/messaging-realtime/redis-io.adapter.ts`

```typescript
// Change from warn to throw in production
async connectToRedis() {
  try {
    await this.pubClient.connect();
    await this.subClient.connect();
    this.adapter = createAdapter(this.pubClient, this.subClient);
    this.bound = true;
    this.logger.log('Redis adapter connected successfully');
  } catch (error) {
    this.logger.error(`Redis adapter connection failed: ${error.message}`);
    
    if (process.env.NODE_ENV === 'production') {
      throw error; // Fail boot in production
    } else {
      this.logger.warn('Continuing in single-instance mode (development only)');
      this.bound = false;
    }
  }
}
```

---

### Step 3: Wire Up Validation

**File:** `src/app.module.ts`

```typescript
import { ProductionValidationService } from './config/production-validation.service';

@Module({
  imports: [ ... ],
  providers: [
    ProductionValidationService, // Runs on module init
    // ... other providers
  ],
})
export class AppModule {}
```

---

## Testing

### Unit Tests

**File:** `src/config/production-validation.service.spec.ts`

```typescript
describe('ProductionValidationService', () => {
  it('throws if REDIS_URL missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;
    
    const config = new ConfigService();
    const service = new ProductionValidationService(config);
    
    expect(() => service.onModuleInit()).toThrow('REDIS_URL is required');
  });

  it('throws if photo storage not S3 in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.PHOTO_STORAGE_DRIVER = 'local';
    
    expect(() => service.onModuleInit()).toThrow('must be "s3"');
  });

  it('does not throw in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.REDIS_URL;
    
    expect(() => service.onModuleInit()).not.toThrow();
  });
});
```

---

### Manual Testing

```bash
# Test 1: Missing Redis URL
NODE_ENV=production REDIS_URL= npm start
# Expected: Boot fails with clear error message

# Test 2: Wrong photo driver
NODE_ENV=production PHOTO_STORAGE_DRIVER=local npm start
# Expected: Boot fails with clear error message

# Test 3: Mock moderation
NODE_ENV=production PHOTO_MODERATION_DRIVER=mock npm start
# Expected: Boot fails with clear error message

# Test 4: All valid
NODE_ENV=production \
  REDIS_URL=redis://... \
  PHOTO_STORAGE_DRIVER=s3 \
  PHOTO_S3_BUCKET=my-bucket \
  PHOTO_S3_REGION=us-east-1 \
  PHOTO_MODERATION_DRIVER=rekognition \
  AWS_ACCESS_KEY_ID=... \
  AWS_SECRET_ACCESS_KEY=... \
  npm start
# Expected: Boot succeeds, logs "✅ All production validations passed"
```

---

## SOLID/OOP/KISS Checklist

- [ ] Validation service has ONE responsibility (config checks)
- [ ] Each validation method checks ONE thing
- [ ] KISS: Simple throws, no complex retry/fallback
- [ ] Fail-fast: App doesn't start if misconfigured
- [ ] Clear error messages guide ops team to fix
- [ ] Development mode unaffected (validations only in production)

---

## Files Changed

**New:**
- `src/config/production-validation.service.ts` (~80 LOC)
- `src/config/production-validation.service.spec.ts`

**Modified:**
- `src/app.module.ts` (+1 provider)
- `src/health/health.service.ts` (deep checks)
- `src/health/health.controller.ts` (return 503 if unhealthy)
- `src/messaging-realtime/redis-io.adapter.ts` (throw in prod)

---

## Success Criteria

- [ ] Production boot fails if REDIS_URL missing
- [ ] Production boot fails if PHOTO_STORAGE_DRIVER != 's3'
- [ ] Production boot fails if PHOTO_MODERATION_DRIVER != 'rekognition'
- [ ] Health check returns 503 if Redis or DB unreachable
- [ ] Development mode unaffected (no validation errors)
- [ ] Error messages are clear and actionable

---

## Effort Estimate

- Validation service: 2 hours
- Redis fail-fast: 1 hour
- Health check deep checks: 2 hours
- Testing: 3 hours

**Total:** 8 hours (~1 day)
